# RV Radio

Local radio stack with MPD, Icecast, an Express metadata API, and a Vue/Vite frontend.

## Services

- `icecast`: receives the MPD stream and exposes `/radio.mp3` plus status endpoints.
- `mpd`: scans `mpd/music`, plays tracks, and streams them to Icecast.
- `backend`: reads `status-json.xsl`, matches the current release id against `backend/data/forSale.json`, and exposes `/nowplaying`.
- `frontend`: plays the stream and renders current release data.

## Local Development

Start everything:

```bash
docker compose up --build
```

Open:

```text
http://localhost:5500
```

Useful endpoints:

```text
http://localhost:3001/nowplaying
http://localhost:8001/status-json.xsl
http://localhost:8001/radio.mp3
```

The Docker Compose setup is configured for development:

- `frontend` mounts `./frontend:/app` and runs Vite, so Vue changes hot reload.
- `backend` mounts `./backend:/app` and runs `node --watch`, so API changes restart automatically.
- anonymous `/app/node_modules` volumes keep container dependencies from being hidden by the source mounts.

Stop services:

```bash
docker compose down
```

## Environment

Copy `.env.example` if you want local shell variables:

```bash
cp .env.example .env
```

Frontend variables:

- `VITE_API_URL`: backend URL used by the browser. Default: `http://localhost:3001`.
- `VITE_STREAM_URL`: Icecast stream URL used by the browser. Default: `http://localhost:8001/radio.mp3`.

Backend variables:

- `ICECAST_URL`: Icecast status JSON URL from the backend container. Default: `http://icecast:8001/status-json.xsl`.
- `MPD_HOST`: MPD host from the backend container. Default: `mpd`.
- `MPD_PORT`: MPD port. Default: `6600`.
- `PORT`: backend port. Default: `3001`.

## Music

Put playable audio files in:

```text
mpd/music/
```

This directory is gitignored. MPD scans it on container start via `mpd/start.sh`, enables random/repeat, and starts playback.

## Metadata Format

`/nowplaying` asks MPD for the current file and then finds that file in:

```text
backend/data/tracks.json
```

Each track entry should include at least:

```json
{
  "id": "6706e9204c92c04e8a26815c",
  "position": "A2",
  "releaseId": 7299819,
  "artist": "Dudu Araujo",
  "title": "A2. Afronta",
  "file": "6706e9204c92c04e8a26815c.mp3",
  "cover": "7299819.jpg"
}
```

MP3 files are named from `id`:

```text
mpd/music/<id>.mp3
```

If MPD is playing `6706e9204c92c04e8a26815c.mp3`, `/nowplaying` strips `.mp3` and looks for `"id": "6706e9204c92c04e8a26815c"` in `tracks.json`.

On every MPD container start, `mpd/start.sh` reads `tracks.json`, generates `mpd/playlists/tracks.m3u`, and loads it with `mpc load tracks`. This preserves the exact order of the `tracks.json` array. `random` is disabled and `repeat` is enabled.

The response always returns JSON. If there is no stream, an invalid title, or an unknown release id, the response uses `status` values such as `no_source`, `invalid_title`, or `release_not_found` instead of hanging.

## Covers

Optional local cover files can be placed in:

```text
frontend/public/covers/<releaseID>.jpg
```

`frontend/public/covers` is gitignored. The cover filename comes from the `cover` field in `tracks.json`.

## Common Checks

Check API:

```bash
curl http://localhost:3001/nowplaying
```

Check MPD playback:

```bash
docker exec -it mpd mpc status
```

If the Icecast HTML status page has XSLT issues, the app can still work as long as these endpoints respond:

```text
http://localhost:8001/status-json.xsl
http://localhost:8001/radio.mp3
```
