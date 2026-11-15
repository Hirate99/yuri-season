-- Routine context needs the review queue, not thousands of already resolved hits.
CREATE INDEX IF NOT EXISTS idx_search_hits_unfinished_recent
  ON search_memory_hits(last_seen_at DESC, id)
  WHERE outcome IN ('candidate', 'held');
