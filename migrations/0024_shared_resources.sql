CREATE TABLE music_tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  lyricist TEXT,
  composer TEXT,
  arranger TEXT,
  official_url TEXT,
  cover_url TEXT,
  cover_source_url TEXT,
  source_url TEXT,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(title, artist)
);

CREATE TABLE anime_theme_songs (
  id TEXT PRIMARY KEY,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  song_kind TEXT NOT NULL CHECK (song_kind IN ('opening', 'ending', 'insert', 'image')),
  sequence INTEGER NOT NULL DEFAULT 1 CHECK (sequence BETWEEN 1 AND 99),
  episode_range TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anime_id, song_kind, sequence),
  UNIQUE(anime_id, track_id, song_kind)
);

CREATE INDEX idx_anime_theme_songs ON anime_theme_songs(anime_id, sort_order, song_kind, sequence);
CREATE INDEX idx_theme_song_track ON anime_theme_songs(track_id, anime_id);

CREATE TABLE discussion_anime (
  discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(discussion_id, anime_id)
);

INSERT OR IGNORE INTO discussion_anime (discussion_id, anime_id)
SELECT id, anime_id FROM discussions;

CREATE INDEX idx_discussion_anime_anime ON discussion_anime(anime_id, discussion_id);
