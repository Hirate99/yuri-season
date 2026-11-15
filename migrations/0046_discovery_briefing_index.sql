CREATE INDEX IF NOT EXISTS idx_search_memory_discovery_recent
  ON search_memory(last_searched_at DESC, id)
  WHERE substr(target_key, 1, 8) <> 'updates:';
