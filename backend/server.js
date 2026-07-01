import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import net from "net";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const ICECAST_URL = process.env.ICECAST_URL || "http://icecast:8001/status-json.xsl";
const MPD_HOST = process.env.MPD_HOST || "mpd";
const MPD_PORT = Number.parseInt(process.env.MPD_PORT || "6600", 10);
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
  status: "empty",
};

const readItemsForSale = async () => {
  return JSON.parse(await fs.promises.readFile("data/forSale.json", "utf-8"));
};

const readTracks = async () => {
  return JSON.parse(await fs.promises.readFile("data/tracks.json", "utf-8"));
};

const getSource = (source) => {
  if (Array.isArray(source)) {
    return source.find((item) => item?.title) || source[0] || {};
  }

  return source || {};
};

const getCurrentMpdFile = () => {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: MPD_HOST, port: MPD_PORT });
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

const findTrackById = (tracks, currentFile) => {
  const trackId = getTrackIdFromFile(currentFile);

  if (!trackId) {
    return null;
  }

  return tracks.find((track) => track.id === trackId);
};

app.get("/info", async (req, res) => {
  try {
    const itemsForSale = await readItemsForSale();
    res.json({
        data: itemsForSale
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/nowplaying", async (req, res) => {
  try {
    const response = await fetch(ICECAST_URL);
    if (!response.ok) {
      res.status(502).json({
        ...EMPTY_NOW_PLAYING,
        status: "icecast_error",
        error: `Icecast responded with ${response.status}`,
      });
      return;
    }

    const data = await response.json();
    const source = getSource(data.icestats?.source);
    const currentFile = await getCurrentMpdFile();

    if (!currentFile) {
      res.json({
        ...EMPTY_NOW_PLAYING,
        status: "no_current_file",
        rawTitle: source.title || null,
        rawFile: currentFile,
      });
      return;
    }

    const tracks = await readTracks();
    const track = findTrackById(tracks, currentFile);

    if (!track) {
      res.json({
        ...EMPTY_NOW_PLAYING,
        status: "track_not_found",
        rawTitle: source.title,
        rawFile: currentFile,
      });
      return;
    }

    res.json({
      id: track.id || null,
      releaseID: track.releaseId || null,
      imageUrl: track.cover ? `/covers/${track.cover}` : null,
      fallbackImageUrl: null,
      title: track.title || null,
      artist: track.artist || null,
      media: track.media || null,
      sleeve: track.sleeve || null,
      price: track.price || null,
      link: track.link || null,
      position: track.position || null,
      status: "ok",
      rawTitle: source.title,
      rawFile: currentFile,
    });
  } catch (err) {
    res.status(500).json({
      ...EMPTY_NOW_PLAYING,
      status: "backend_error",
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
