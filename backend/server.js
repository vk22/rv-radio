import express from "express";
import "express-async-errors";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import net from "net";
import { randomUUID } from "crypto";
import { pool, migrate } from "./db.js";
import {
  clearSession,
  createSession,
  hashPassword,
  optionalAuth,
  requireAuth,
  verifyPassword,
} from "./auth.js";

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5500",
  credentials: true,
}));
app.use(express.json());
app.use(optionalAuth);

const PORT = process.env.PORT || 3001;
const ICECAST_URL = process.env.ICECAST_URL || "http://icecast:8001/status-json.xsl";
const MPD_HOST = process.env.MPD_HOST || "mpd";
const DEFAULT_STREAM_BASE_URL = process.env.STREAM_BASE_URL || "http://localhost:8001";
const MUSIC_DIR = process.env.MUSIC_DIR || "/music";
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
  await fs.promises.mkdir(new URL("./", fileUrl), { recursive: true, mode: 0o755 });
  await fs.promises.writeFile(fileUrl, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o644 });
};

const readTracks = (channelId) => readJson(`channels/${channelId}/tracks.json`, []);

const ensureChannelStorage = async (channelId) => {
  const tracksPath = `channels/${channelId}/tracks.json`;
  await fs.promises.mkdir(getDataUrl(`channels/${channelId}/`), { recursive: true, mode: 0o755 });
  await fs.promises.mkdir(`${MUSIC_DIR}/${channelId}`, { recursive: true, mode: 0o755 });

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
    description: String(channel.description || ""),
    cover: channel.cover || null,
    accentColor: channel.accentColor || channel.accent_color || "#111111",
    enabled: channel.enabled !== false,
    mount: channel.mount || `/${id}.mp3`,
    mpdPort: Number.parseInt(channel.mpdPort || channel.mpd_port || 6600 + index, 10),
    trackIds: Array.isArray(channel.trackIds || channel.track_ids) ? (channel.trackIds || channel.track_ids) : undefined,
    sortOrder: Number.parseInt(channel.sortOrder ?? channel.sort_order ?? index, 10),
  };
};

const readChannels = async () => {
  const result = await pool.query(
    `SELECT id, name, description, cover, accent_color, enabled, mount, mpd_port, track_ids, sort_order
     FROM channels ORDER BY sort_order, created_at, id`,
  );
  return result.rows.map(normalizeChannel);
};

const serializeChannel = (channel) => ({
  ...channel,
  streamUrl: `${DEFAULT_STREAM_BASE_URL.replace(/\/$/, "")}${channel.mount}`,
});

const getChannel = async (channelId = "main") => {
  const channels = await readChannels();
  return channels.find((channel) => channel.id === channelId) || null;
};

const getPublicChannel = async (channelId, userId = null) => {
  const channel = await getChannel(channelId);
  if (!channel) return null;
  const result = await pool.query(
    `SELECT count(*)::int AS "likesCount",
      coalesce(bool_or(user_id = $2), false) AS "likedByCurrentUser"
     FROM channel_likes WHERE channel_id = $1`,
    [channelId, userId],
  );
  return { ...serializeChannel(channel), ...result.rows[0] };
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
    const channels = (await readChannels()).map(serializeChannel);
    res.json({ data: channels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/register", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Valid email is required" });
  if (username.length < 2 || username.length > 50) return res.status(400).json({ error: "Username must be 2–50 characters" });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Password must be 8–128 characters" });

  try {
    const user = {
      id: randomUUID(),
      email,
      username,
      passwordHash: await hashPassword(password),
    };
    await pool.query(
      "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)",
      [user.id, user.email, user.username, user.passwordHash],
    );
    await createSession(res, user.id);
    res.status(201).json({ data: { id: user.id, email, username, avatarUrl: null } });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Email is already registered" });
    throw error;
  }
});

app.post("/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const result = await pool.query(
    `SELECT id, email, username, avatar_url AS "avatarUrl", password_hash AS "passwordHash"
     FROM users WHERE email = $1`,
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await verifyPassword(String(req.body.password || ""), user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  await createSession(res, user.id);
  delete user.passwordHash;
  res.json({ data: user });
});

app.post("/auth/logout", async (req, res) => {
  await clearSession(req, res);
  res.status(204).end();
});

app.get("/auth/me", (req, res) => res.json({ data: req.user }));

app.get("/channels/:id", async (req, res) => {
  const channel = await getPublicChannel(req.params.id, req.user?.id);
  if (!channel || !channel.enabled) return res.status(404).json({ error: "Channel not found" });
  res.json({ data: channel });
});

app.put("/channels/:id/like", requireAuth, async (req, res) => {
  if (!(await getChannel(req.params.id))) return res.status(404).json({ error: "Channel not found" });
  await pool.query(
    "INSERT INTO channel_likes (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [req.params.id, req.user.id],
  );
  const channel = await getPublicChannel(req.params.id, req.user.id);
  res.json({ data: { likesCount: channel.likesCount, likedByCurrentUser: true } });
});

app.delete("/channels/:id/like", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM channel_likes WHERE channel_id = $1 AND user_id = $2", [req.params.id, req.user.id]);
  const channel = await getPublicChannel(req.params.id, req.user.id);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  res.json({ data: { likesCount: channel.likesCount, likedByCurrentUser: false } });
});

app.get("/channels/:id/comments", async (req, res) => {
  if (!(await getChannel(req.params.id))) return res.status(404).json({ error: "Channel not found" });
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "30", 10), 1), 100);
  const before = req.query.before ? new Date(req.query.before) : null;
  if (before && Number.isNaN(before.getTime())) return res.status(400).json({ error: "Invalid cursor" });
  const result = await pool.query(
    `SELECT c.id, c.body, c.created_at AS "createdAt", c.updated_at AS "updatedAt",
      json_build_object('id', u.id, 'username', u.username, 'avatarUrl', u.avatar_url) AS user
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.channel_id = $1 AND ($2::timestamptz IS NULL OR c.created_at < $2)
     ORDER BY c.created_at DESC LIMIT $3`,
    [req.params.id, before, limit + 1],
  );
  const hasMore = result.rows.length > limit;
  const comments = result.rows.slice(0, limit);
  res.json({ data: comments, nextCursor: hasMore ? comments.at(-1).createdAt : null });
});

app.post("/channels/:id/comments", requireAuth, async (req, res) => {
  if (!(await getChannel(req.params.id))) return res.status(404).json({ error: "Channel not found" });
  const body = String(req.body.body || "").trim();
  if (!body || body.length > 2000) return res.status(400).json({ error: "Comment must be 1–2000 characters" });
  const result = await pool.query(
    `INSERT INTO comments (id, channel_id, user_id, body) VALUES ($1, $2, $3, $4)
     RETURNING id, body, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [randomUUID(), req.params.id, req.user.id, body],
  );
  res.status(201).json({ data: { ...result.rows[0], user: req.user } });
});

app.delete("/comments/:id", requireAuth, async (req, res) => {
  const result = await pool.query("DELETE FROM comments WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Comment not found" });
  res.status(204).end();
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
  const channels = await readChannels();
  res.json({ data: channels });
});

app.post("/admin/channels", async (req, res) => {
  const channels = await readChannels();
  const channel = normalizeChannel(req.body, channels.length);

  if (!channel.id) {
    res.status(400).json({ error: "Channel id is required" });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO channels
        (id, name, description, cover, accent_color, enabled, mount, mpd_port, track_ids, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [channel.id, channel.name, channel.description, channel.cover, channel.accentColor,
        channel.enabled, channel.mount, channel.mpdPort, channel.trackIds ? JSON.stringify(channel.trackIds) : null,
        channel.sortOrder],
    );
    await ensureChannelStorage(channel.id);
    res.status(201).json({ data: channel, applyAutomatically: true });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Channel id, mount or MPD port already exists" });
    throw error;
  }
});

app.patch("/admin/channels/:id", async (req, res) => {
  const channels = await readChannels();
  const index = channels.findIndex((channel) => channel.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  const nextChannel = normalizeChannel({ ...channels[index], ...req.body, id: channels[index].id }, index);
  try {
    await pool.query(
      `UPDATE channels SET name = $2, description = $3, cover = $4, accent_color = $5,
        enabled = $6, mount = $7, mpd_port = $8, track_ids = $9, sort_order = $10, updated_at = now()
       WHERE id = $1`,
      [nextChannel.id, nextChannel.name, nextChannel.description, nextChannel.cover,
        nextChannel.accentColor, nextChannel.enabled, nextChannel.mount, nextChannel.mpdPort,
        nextChannel.trackIds ? JSON.stringify(nextChannel.trackIds) : null, nextChannel.sortOrder],
    );
    res.json({ data: nextChannel, applyAutomatically: true });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Mount or MPD port already exists" });
    throw error;
  }
});

app.delete("/admin/channels/:id", async (req, res) => {
  const result = await pool.query("DELETE FROM channels WHERE id = $1", [req.params.id]);
  if (!result.rowCount) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.json({ data: { id: req.params.id }, applyAutomatically: true });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

await migrate();
for (const channel of await readChannels()) await ensureChannelStorage(channel.id);
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
