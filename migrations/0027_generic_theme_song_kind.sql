CREATE TABLE anime_theme_songs_new (
  id TEXT PRIMARY KEY,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  song_kind TEXT NOT NULL CHECK (song_kind IN ('opening', 'ending', 'theme', 'insert', 'image')),
  sequence INTEGER NOT NULL DEFAULT 1 CHECK (sequence BETWEEN 1 AND 99),
  episode_range TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anime_id, song_kind, sequence),
  UNIQUE(anime_id, track_id, song_kind)
);

INSERT INTO anime_theme_songs_new (
  id, anime_id, track_id, song_kind, sequence, episode_range,
  sort_order, created_at, updated_at
)
SELECT
  id, anime_id, track_id, song_kind, sequence, episode_range,
  sort_order, created_at, updated_at
FROM anime_theme_songs;

DROP TABLE anime_theme_songs;
ALTER TABLE anime_theme_songs_new RENAME TO anime_theme_songs;

CREATE INDEX idx_anime_theme_songs
  ON anime_theme_songs(anime_id, sort_order, song_kind, sequence);
CREATE INDEX idx_theme_song_track
  ON anime_theme_songs(track_id, anime_id);
