-- Global recency and URL lookups cannot use the memory_id-leading indexes.
-- These two queries consumed 4.6M row reads in the 2026-11-15 incident.
CREATE INDEX IF NOT EXISTS idx_search_hits_recent
  ON search_memory_hits(last_seen_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_search_hits_url
  ON search_memory_hits(canonical_url);

-- LIMIT alone does not bound reads when SQLite must scan and sort first.
CREATE INDEX IF NOT EXISTS idx_research_runs_recent
  ON research_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_recent
  ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_items_admin_recent
  ON feed_items(withdrawn_at, created_at DESC)
  WHERE candidate_id IS NOT NULL AND withdrawn_at IS NULL;
