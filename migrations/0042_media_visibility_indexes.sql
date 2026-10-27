-- publicMedia checks these links for every media item, including admin coverage.
-- Index both probes so coverage does not repeatedly scan candidates/publications.
CREATE INDEX IF NOT EXISTS idx_candidates_media
  ON feed_candidates(media_id);

CREATE INDEX IF NOT EXISTS idx_feed_items_media_public
  ON feed_items(media_id, withdrawn_at);
