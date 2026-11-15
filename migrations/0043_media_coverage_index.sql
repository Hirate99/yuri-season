-- Coverage only needs anime_id for grouping and id for visibility probes.
-- Keep both in the index to avoid fetching each media_items table row.
CREATE INDEX IF NOT EXISTS idx_media_coverage
  ON media_items(anime_id, id);
