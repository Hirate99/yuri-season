CREATE TABLE search_memory (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('season', 'anime', 'person', 'character', 'source', 'global')),
  scope_id TEXT NOT NULL,
  search_kind TEXT NOT NULL CHECK (search_kind IN ('registered_source', 'official_news', 'social', 'birthday', 'media', 'community', 'catalog')),
  target_key TEXT NOT NULL,
  query_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'blocked')),
  cursor_json TEXT NOT NULL DEFAULT '{}',
  last_result_hash TEXT,
  last_result_count INTEGER NOT NULL DEFAULT 0,
  useful_result_count INTEGER NOT NULL DEFAULT 0,
  last_searched_at TEXT,
  next_search_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scope_type, scope_id, search_kind, target_key)
);

CREATE TABLE search_memory_hits (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL REFERENCES search_memory(id) ON DELETE CASCADE,
  canonical_url TEXT NOT NULL,
  title TEXT,
  content_hash TEXT,
  outcome TEXT NOT NULL DEFAULT 'seen' CHECK (outcome IN ('seen', 'candidate', 'published', 'held', 'rejected', 'ignored')),
  observation_id TEXT REFERENCES source_observations(id) ON DELETE SET NULL,
  candidate_id TEXT REFERENCES feed_candidates(id) ON DELETE SET NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(memory_id, canonical_url)
);

CREATE INDEX idx_search_memory_due ON search_memory(status, next_search_at, search_kind);
CREATE INDEX idx_search_hits_outcome ON search_memory_hits(memory_id, outcome, last_seen_at DESC);
