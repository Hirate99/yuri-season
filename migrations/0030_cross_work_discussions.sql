CREATE TABLE candidate_anime (
  candidate_id TEXT NOT NULL REFERENCES feed_candidates(id) ON DELETE CASCADE,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(candidate_id, anime_id)
);

INSERT OR IGNORE INTO candidate_anime (candidate_id, anime_id)
SELECT id, anime_id FROM feed_candidates WHERE anime_id IS NOT NULL;

CREATE INDEX idx_candidate_anime_anime ON candidate_anime(anime_id, candidate_id);
