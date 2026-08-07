CREATE TABLE channels (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  cover TEXT,
  accent_color TEXT NOT NULL DEFAULT '#111111',
  enabled BOOLEAN NOT NULL DEFAULT true,
  mount TEXT NOT NULL UNIQUE,
  mpd_port INTEGER NOT NULL UNIQUE CHECK (mpd_port BETWEEN 1024 AND 65535),
  track_ids JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO channels (id, name, description, accent_color, enabled, mount, mpd_port, sort_order)
VALUES
  ('main', 'Rare Groove Atlas', 'Funk, soul, disco, boogie, jazz-funk, P-Funk, street soul, rare R&B and private dance records.', '#090909', true, '/main.mp3', 6600, 0),
  ('revibed', 'Vinyl Club Memory', 'A continuous selection of deep vinyl cuts, forgotten dance music and timeless grooves.', '#174f28', true, '/revibed.mp3', 6601, 1)
ON CONFLICT (id) DO NOTHING;

DELETE FROM channel_likes WHERE channel_id NOT IN (SELECT id FROM channels);
DELETE FROM comments WHERE channel_id NOT IN (SELECT id FROM channels);

ALTER TABLE channel_likes
  ADD CONSTRAINT channel_likes_channel_fk
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;

ALTER TABLE comments
  ADD CONSTRAINT comments_channel_fk
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;
