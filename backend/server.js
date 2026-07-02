import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import net from "net";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ICECAST_URL = process.env.ICECAST_URL || "http://icecast:8001/status-json.xsl";
const MPD_HOST = process.env.MPD_HOST || "mpd";
const DEFAULT_STREAM_BASE_URL = process.env.STREAM_BASE_URL || "http://localhost:8001";
const DATA_DIR = new URL("./data/", import.meta.url);

const EMPTY_NOW_PLAYING = {
  id: null,
  releaseID: null,
  imageUrl: null,
  fallbackImageUrl: null,
  title: null,
  artist: null,
  media: null,
  sleeve: null,
  price: null,
  link: null,
  position: null,
  status: "empty",
};

const getDataUrl = (fileName) => new URL(fileName, DATA_DIR);

const readJson = async (fileName, fallback) => {
  try {
    return JSON.parse(await fs.promises.readFile(getDataUrl(fileName), "utf-8"));
  } catch (err) {
    if (err.code === "ENOENT" && fallback !== undefined) {
      return fallback;
    }

    throw err;
  }
};

const writeJson = async (fileName, data) => {
  const fileUrl = getDataUrl(fileName);
  await fs.promises.mkdir(new URL("./", fileUrl), { recursive: true });
  await fs.promises.writeFile(fileUrl, `${JSON.stringify(data, null, 2)}\n`);
};

const readTracks = (channelId) => readJson(`channels/${channelId}/tracks.json`, []);
const readChannels = () => readJson("channels.json");

const ensureChannelTracks = async (channelId) => {
  const tracksPath = `channels/${channelId}/tracks.json`;
  await fs.promises.mkdir(getDataUrl(`channels/${channelId}/`), { recursive: true });

  try {
    await fs.promises.access(getDataUrl(tracksPath));
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }

    await writeJson(tracksPath, []);
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

const normalizeChannel = (channel, index = 0) => {
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

const serializeChannel = (channel) => ({
  ...channel,
  streamUrl: `${DEFAULT_STREAM_BASE_URL.replace(/\/$/, "")}${channel.mount}`,
});

const getChannel = async (channelId = "main") => {
  const channels = (await readChannels()).map(normalizeChannel);
  return channels.find((channel) => channel.id === channelId) || channels.find((channel) => channel.enabled) || channels[0] || null;
};

const getSourceForMount = (source, mount) => {
  if (Array.isArray(source)) {
    return source.find((item) => item?.listenurl?.endsWith(mount) || item?.["@mount"] === mount || item?.mount === mount) || {};
  }

  if (source?.listenurl?.endsWith(mount) || source?.["@mount"] === mount || source?.mount === mount) {
    return source;
  }

  return {};
};

const getCurrentMpdFile = (port) => {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: MPD_HOST, port });
    let buffer = "";
    let commandSent = false;

    const finish = (filename = null) => {
      socket.destroy();
      resolve(filename);
    };

    socket.setTimeout(2000, () => finish());
    socket.on("error", () => finish());
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      if (!commandSent && buffer.startsWith("OK MPD")) {
        commandSent = true;
        socket.write("currentsong\nclose\n");
      }

      if (buffer.includes("\nOK\n")) {
        const fileLine = buffer.split("\n").find((line) => line.startsWith("file: "));
        finish(fileLine ? fileLine.slice("file: ".length).trim() : null);
      }
    });
  });
};

const getTrackIdFromFile = (currentFile) => {
  if (!currentFile) {
    return null;
  }

  return currentFile.replace(/\.mp3$/i, "");
};

const findTrackByCurrentFile = (tracks, currentFile) => {
  const trackId = getTrackIdFromFile(currentFile);

  if (!trackId) {
    return null;
  }

  return tracks.find((track) => track.id === trackId);
};

const getNowPlaying = async (channelId = "main") => {
  const channel = await getChannel(channelId);

  if (!channel) {
    return {
      ...EMPTY_NOW_PLAYING,
      status: "channel_not_found",
      channel: null,
    };
  }

  const response = await fetch(ICECAST_URL);
  if (!response.ok) {
    return {
      ...EMPTY_NOW_PLAYING,
      status: "icecast_error",
      channel: serializeChannel(channel),
      error: `Icecast responded with ${response.status}`,
    };
  }

  const data = await response.json();
  const source = getSourceForMount(data.icestats?.source, channel.mount);
  const currentFile = await getCurrentMpdFile(channel.mpdPort);

  if (!currentFile) {
    return {
      ...EMPTY_NOW_PLAYING,
      status: "no_current_file",
      channel: serializeChannel(channel),
      rawTitle: source.title || null,
      rawFile: currentFile,
    };
  }

  const tracks = await readTracks(channel.id);
  const track = findTrackByCurrentFile(tracks, currentFile);

  if (!track) {
    return {
      ...EMPTY_NOW_PLAYING,
      status: "track_not_found",
      channel: serializeChannel(channel),
      rawTitle: source.title,
      rawFile: currentFile,
    };
  }

  return {
    id: track.id || null,
    releaseID: track.releaseId || null,
    imageUrl: track.cover ? `/covers/${channel.id}/${track.cover}` : null,
    fallbackImageUrl: null,
    title: track.title || null,
    artist: track.artist || null,
    media: track.media || null,
    sleeve: track.sleeve || null,
    price: track.price || null,
    link: track.link || null,
    position: track.position || null,
    status: "ok",
    channel: serializeChannel(channel),
    rawTitle: source.title,
    rawFile: currentFile,
  };
};

app.get("/info", async (req, res) => {
  try {
    res.json({ data: await readJson("forSale.json") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/channels", async (req, res) => {
  try {
    const channels = (await readChannels()).map(normalizeChannel).map(serializeChannel);
    res.json({ data: channels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/channels/:id/nowplaying", async (req, res) => {
  try {
    res.json(await getNowPlaying(req.params.id));
  } catch (err) {
    res.status(500).json({ ...EMPTY_NOW_PLAYING, status: "backend_error", error: err.message });
  }
});

app.get("/nowplaying", async (req, res) => {
  try {
    res.json(await getNowPlaying("main"));
  } catch (err) {
    res.status(500).json({ ...EMPTY_NOW_PLAYING, status: "backend_error", error: err.message });
  }
});

app.get("/admin/channels", async (req, res) => {
  const channels = (await readChannels()).map(normalizeChannel);
  res.json({ data: channels });
});

app.post("/admin/channels", async (req, res) => {
  const channels = (await readChannels()).map(normalizeChannel);
  const channel = normalizeChannel(req.body, channels.length);

  if (!channel.id) {
    res.status(400).json({ error: "Channel id is required" });
    return;
  }

  if (channels.some((item) => item.id === channel.id)) {
    res.status(409).json({ error: "Channel already exists" });
    return;
  }

  const nextChannels = [...channels, channel];
  await ensureChannelTracks(channel.id);
  await writeJson("channels.json", nextChannels);
  res.status(201).json({ data: channel, applyAutomatically: true });
});

app.patch("/admin/channels/:id", async (req, res) => {
  const channels = (await readChannels()).map(normalizeChannel);
  const index = channels.findIndex((channel) => channel.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  const nextChannel = normalizeChannel({ ...channels[index], ...req.body, id: channels[index].id }, index);
  const nextChannels = channels.toSpliced(index, 1, nextChannel);
  await writeJson("channels.json", nextChannels);
  res.json({ data: nextChannel, applyAutomatically: true });
});

app.delete("/admin/channels/:id", async (req, res) => {
  const channels = (await readChannels()).map(normalizeChannel);
  const nextChannels = channels.filter((channel) => channel.id !== req.params.id);

  if (nextChannels.length === channels.length) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  await writeJson("channels.json", nextChannels);
  res.json({ data: nextChannels, applyAutomatically: true });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
