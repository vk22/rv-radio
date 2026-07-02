const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const CHANNELS_PATH = "/channels.json";
const MUSIC_DIR = "/music";
const PLAYLIST_DIR = "/playlists";
const RUNTIME_DIR = "/var/lib/mpd";
const GENERATED_DIR = "/tmp/mpd-generated";
const ICECAST_HOST = process.env.ICECAST_HOST || "icecast";
const ICECAST_PORT = Number.parseInt(process.env.ICECAST_PORT || "8001", 10);
const ICECAST_SOURCE_PASSWORD = process.env.ICECAST_SOURCE_PASSWORD || "sourcepass";

let children = [];
let restartTimer;
let watchedTrackFiles = new Set();

const readJson = (filePath, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err.message);
    return fallback;
  }
};

const normalizeChannelId = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const normalizeChannel = (channel, index) => {
  const id = normalizeChannelId(channel.id || channel.name || `channel-${index + 1}`);

  return {
    id,
    name: String(channel.name || id),
    enabled: channel.enabled !== false,
    mount: channel.mount || `/${id}.mp3`,
    mpdPort: Number.parseInt(channel.mpdPort || 6600 + index, 10),
    trackIds: Array.isArray(channel.trackIds) ? channel.trackIds : undefined,
  };
};

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const writeChannelFiles = (channel, tracks) => {
  const channelDir = path.join(RUNTIME_DIR, channel.id);
  ensureDir(channelDir);
  ensureDir(GENERATED_DIR);
  ensureDir(PLAYLIST_DIR);

  const channelMusicDir = path.join(MUSIC_DIR, channel.id);
  const selectedTracks = channel.trackIds?.length
    ? tracks.filter((track) => channel.trackIds.includes(track.id))
    : tracks;

  const playlistName = `${channel.id}.m3u`;
  const playlistPath = path.join(PLAYLIST_DIR, playlistName);
  fs.writeFileSync(playlistPath, `${selectedTracks.map((track) => `${track.id}.mp3`).join("\n")}\n`);

  const configPath = path.join(GENERATED_DIR, `${channel.id}.conf`);
  fs.writeFileSync(
    configPath,
    [
      `music_directory "${channelMusicDir}"`,
      `playlist_directory "${PLAYLIST_DIR}"`,
      `db_file "${channelDir}/tag_cache"`,
      `log_file "${channelDir}/mpd.log"`,
      `pid_file "${channelDir}/pid"`,
      `state_file "${channelDir}/state"`,
      `sticker_file "${channelDir}/sticker.sql"`,
      `bind_to_address "0.0.0.0"`,
      `port "${channel.mpdPort}"`,
      `auto_update "yes"`,
      `auto_update_depth "3"`,
      `audio_output {`,
      `  type "shout"`,
      `  name "${channel.name}"`,
      `  host "${ICECAST_HOST}"`,
      `  port "${ICECAST_PORT}"`,
      `  mount "${channel.mount}"`,
      `  password "${ICECAST_SOURCE_PASSWORD}"`,
      `  format "44100:16:2"`,
      `  encoding "mp3"`,
      `  bitrate "128"`,
      `}`,
      "",
    ].join("\n"),
  );

  return { configPath, playlistName: channel.id };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runMpc = (port, args) => {
  return new Promise((resolve) => {
    const child = spawn("mpc", ["-h", "127.0.0.1", "-p", String(port), ...args], { stdio: "inherit" });
    child.on("exit", () => resolve());
    child.on("error", () => resolve());
  });
};

const stopChildren = async () => {
  for (const child of children) {
    child.kill("SIGTERM");
  }

  await wait(1000);

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  }

  children = [];
};

const start = async () => {
  await stopChildren();

  const channels = readJson(CHANNELS_PATH, []).map(normalizeChannel).filter((channel) => channel.enabled);
  watchTrackFiles(channels);

  if (!channels.length) {
    console.warn("No enabled channels. Waiting for channels.json changes.");
    return;
  }

  for (const channel of channels) {
    const tracks = readJson(`/channels/${channel.id}/tracks.json`, []);
    const { configPath, playlistName } = writeChannelFiles(channel, tracks);
    const child = spawn("mpd", ["--no-daemon", configPath], {
      stdio: ["ignore", "inherit", "inherit"],
    });

    child.on("exit", (code, signal) => {
      console.warn(`MPD channel ${channel.id} exited`, { code, signal });
    });

    children.push(child);
    await wait(1500);
    await runMpc(channel.mpdPort, ["update", "--wait"]);
    await runMpc(channel.mpdPort, ["clear"]);
    await runMpc(channel.mpdPort, ["load", playlistName]);
    await runMpc(channel.mpdPort, ["random", "off"]);
    await runMpc(channel.mpdPort, ["repeat", "on"]);
    await runMpc(channel.mpdPort, ["play"]);
    console.log(`Started channel ${channel.id} on ${channel.mount} via MPD port ${channel.mpdPort}`);
  }
};

const scheduleRestart = () => {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    start().catch((err) => console.error("Failed to restart channels:", err));
  }, 1000);
};

const watchTrackFiles = (channels) => {
  const nextTrackFiles = new Set(channels.map((channel) => `/channels/${channel.id}/tracks.json`));

  for (const filePath of watchedTrackFiles) {
    if (!nextTrackFiles.has(filePath)) {
      fs.unwatchFile(filePath, scheduleRestart);
    }
  }

  for (const filePath of nextTrackFiles) {
    if (!watchedTrackFiles.has(filePath)) {
      fs.watchFile(filePath, { interval: 2000 }, scheduleRestart);
    }
  }

  watchedTrackFiles = nextTrackFiles;
};

fs.watchFile(CHANNELS_PATH, { interval: 2000 }, scheduleRestart);

process.on("SIGTERM", async () => {
  await stopChildren();
  process.exit(0);
});

start().catch((err) => {
  console.error("Failed to start radio manager:", err);
  process.exit(1);
});
