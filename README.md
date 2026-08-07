# RV Radio

Local radio stack with MPD, Icecast, an Express metadata API, and a Vue/Vite frontend.

## Services

- `icecast`: receives MPD streams and exposes channel mountpoints plus status endpoints.
- `mpd`: radio manager that reads channel configuration from the backend API and starts one MPD process per enabled channel.
- `backend`: reads `status-json.xsl`, asks MPD for the current file, matches it against the channel `tracks.json`, and exposes `/nowplaying`.
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
http://localhost:8001/main.mp3
```

The Docker Compose setup is configured for development:

- `frontend` mounts `./frontend:/app` and runs Vite, so Vue changes hot reload.
- `backend` mounts its source, migrations, and data directories and runs `node --watch`, so API changes restart automatically.

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
- `VITE_STREAM_BASE_URL`: Icecast stream base URL used by the browser. Default: `http://localhost:8001`.
- `VITE_STREAM_URL`: legacy single-stream URL fallback. Prefer `VITE_STREAM_BASE_URL`.

Backend variables:

- `ICECAST_URL`: Icecast status JSON URL from the backend container. Default: `http://icecast:8001/status-json.xsl`.
- `MPD_HOST`: MPD host from the backend container. Default: `mpd`.
- `STREAM_BASE_URL`: public Icecast stream base URL returned by the API. Default: `http://localhost:8001`.
- `PORT`: backend port. Default: `3001`.

## Music

Put playable audio files in:

```text
mpd/music/<channelId>/
```

For the default channel:

```text
mpd/music/main/
```

This directory is gitignored. MP3 files are named from track ids in the channel `tracks.json`: `{id}.mp3`.

## Channels

Channel configuration lives in PostgreSQL and is managed at:

```text
http://localhost:5500/admin
```

The editable fields are `name`, `description`, `cover`, `accentColor`, `enabled`, `mount`, `mpdPort`, `sortOrder`, and optional `trackIds`. The channel `id` is immutable after creation because it is used by URLs and media directories.

The public API is:

```text
http://localhost:3001/channels
http://localhost:3001/channels/main
```

Each enabled channel starts a separate MPD process and streams to Icecast at its `mount`. With nginx proxying `/stream/` to Icecast, channel URLs become:

```text
https://skyharp.live/stream/main.mp3
https://skyharp.live/stream/second.mp3
```

The admin creates and updates channel records. For each channel, keep its media data in matching directories:

```text
backend/data/channels/<channelId>/tracks.json
mpd/music/<channelId>/*.mp3
frontend/public/covers/<channelId>/*.jpg
```

When a channel is created, backend automatically creates its empty `tracks.json` and `mpd/music/<channelId>/` directory. Existing channel directories are also checked and created on backend startup.

If MPD logs `Failed to access /music/<channelId>`, create that folder and put the channel MP3 files there. The database record can exist without audio, but Icecast will not receive a stream until MPD can read files from `mpd/music/<channelId>/`.

## Metadata Format

`/nowplaying` asks MPD for the current file and then finds that file in:

```text
backend/data/channels/<channelId>/tracks.json
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
mpd/music/<channelId>/<id>.mp3
```

If MPD is playing `6706e9204c92c04e8a26815c.mp3`, `/nowplaying` strips `.mp3` and looks for `"id": "6706e9204c92c04e8a26815c"` in `tracks.json`.

On every MPD manager start or channel `tracks.json` change, the manager generates `mpd/playlists/<channelId>.m3u` and loads it with `mpc load <channelId>`. This preserves the exact order of the channel `tracks.json` array. `random` is disabled and `repeat` is enabled.

The response always returns JSON. If there is no current MPD file or no matching track, the response uses `status` values such as `no_current_file` or `track_not_found` instead of hanging.

## Covers

Optional local cover files can be placed in:

```text
frontend/public/covers/<channelId>/<releaseID>.jpg
```

`frontend/public/covers` is gitignored. The cover filename comes from the `cover` field in the channel `tracks.json`.

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
http://localhost:8001/main.mp3
```
