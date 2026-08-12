PRAGMA foreign_keys = ON;

CREATE TABLE seasons (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE anime (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  parent_anime_id TEXT REFERENCES anime(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title_zh TEXT NOT NULL,
  title_ja TEXT NOT NULL,
  title_en TEXT,
  synopsis TEXT NOT NULL,
  editorial_note TEXT,
  yuri_kind TEXT NOT NULL CHECK (yuri_kind IN ('canon', 'strong', 'adjacent')),
  status TEXT NOT NULL CHECK (status IN ('airing', 'upcoming', 'finished', 'paused')),
  premiere_at TEXT NOT NULL,
  episode_count INTEGER,
  episode_duration_min INTEGER,
  studio TEXT,
  source_material TEXT,
  official_url TEXT,
  bangumi_url TEXT,
  official_x_url TEXT,
  visual_theme TEXT NOT NULL DEFAULT 'lime',
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_native TEXT,
  bio TEXT,
  primary_kind TEXT NOT NULL DEFAULT 'staff' CHECK (primary_kind IN ('author', 'staff', 'cast', 'artist', 'organization')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_native TEXT,
  profile TEXT,
  birthday_month INTEGER CHECK (birthday_month BETWEEN 1 AND 12),
  birthday_day INTEGER CHECK (birthday_day BETWEEN 1 AND 31),
  birthday_year INTEGER,
  birthday_timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  birthday_source_url TEXT,
  birthday_verified INTEGER NOT NULL DEFAULT 0 CHECK (birthday_verified IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE work_credits (
  id TEXT PRIMARY KEY,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  profile_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(anime_id, person_id, role)
);

CREATE TABLE cast_credits (
  id TEXT PRIMARY KEY,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(anime_id, character_id, person_id)
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anime', 'person', 'organization')),
  owner_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT,
  url TEXT NOT NULL UNIQUE,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  monitor_mode TEXT NOT NULL DEFAULT 'local' CHECK (monitor_mode IN ('api', 'rss', 'page', 'local', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE broadcast_slots (
  id TEXT PRIMARY KEY,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  local_time TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  platform_url TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1))
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  anime_id TEXT REFERENCES anime(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  character_id TEXT REFERENCES characters(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('broadcast', 'birthday', 'anniversary', 'stream', 'radio', 'event', 'release')),
  title TEXT NOT NULL,
  starts_at TEXT,
  ends_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  recurrence_rule TEXT,
  source_url TEXT,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_items (
  id TEXT PRIMARY KEY,
  anime_id TEXT REFERENCES anime(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  content_class TEXT NOT NULL CHECK (content_class IN ('official_art', 'creator_art', 'fanart', 'fan_video', 'cosplay')),
  title TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_url TEXT,
  original_url TEXT NOT NULL UNIQUE,
  preview_url TEXT,
  presentation_mode TEXT NOT NULL DEFAULT 'link_only' CHECK (presentation_mode IN ('link_only', 'platform_embed', 'remote_preview', 'mirrored_with_permission')),
  safety_rating TEXT NOT NULL DEFAULT 'unknown' CHECK (safety_rating IN ('safe', 'suggestive', 'adult', 'unknown')),
  spoiler_level TEXT NOT NULL DEFAULT 'none' CHECK (spoiler_level IN ('none', 'mild', 'major')),
  rights_note TEXT,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE discussions (
  id TEXT PRIMARY KEY,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  note TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  last_activity_at TEXT,
  last_checked_at TEXT
);

CREATE TABLE research_sources (
  id TEXT PRIMARY KEY,
  anime_id TEXT REFERENCES anime(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('official_page', 'official_json', 'rss', 'bangumi', 'youtube', 'bluesky', 'mastodon', 'community', 'social')),
  label TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  trust_level TEXT NOT NULL DEFAULT 'official' CHECK (trust_level IN ('official', 'verified_creator', 'community', 'unverified')),
  poll_interval_min INTEGER NOT NULL DEFAULT 360,
  cadence_profile TEXT NOT NULL DEFAULT 'standard' CHECK (cadence_profile IN ('rapid', 'standard', 'local')),
  urgency_until TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  next_check_at TEXT,
  last_checked_at TEXT,
  etag TEXT,
  last_modified TEXT,
  cursor TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  lease_until TEXT
);

CREATE TABLE source_observations (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
  anime_id TEXT REFERENCES anime(id) ON DELETE CASCADE,
  canonical_url TEXT NOT NULL,
  source_item_id TEXT,
  title TEXT,
  excerpt TEXT,
  author_name TEXT,
  published_at TEXT,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  connector_version TEXT NOT NULL DEFAULT 'generic-html@1',
  original_language TEXT,
  content_type TEXT,
  http_status INTEGER,
  content_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE(source_id, content_hash)
);

CREATE TABLE update_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('sync_source', 'discover_work', 'discover_people', 'birthday_refresh', 'community_refresh', 'review_candidate', 'repair_source')),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('season', 'anime', 'person', 'source', 'candidate', 'global')),
  scope_id TEXT,
  research_run_id TEXT REFERENCES research_runs(id) ON DELETE SET NULL,
  execution_target TEXT NOT NULL DEFAULT 'worker' CHECK (execution_target IN ('worker', 'local')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'leased', 'running', 'completed', 'partial', 'retry', 'dead')),
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  scheduled_at TEXT NOT NULL,
  lease_until TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 4,
  budget_json TEXT NOT NULL DEFAULT '{}',
  input_json TEXT NOT NULL DEFAULT '{}',
  dedupe_key TEXT NOT NULL,
  last_error TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL REFERENCES source_observations(id) ON DELETE CASCADE,
  anime_id TEXT REFERENCES anime(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('anime', 'person', 'character', 'event', 'account', 'discussion', 'media')),
  subject_id TEXT,
  predicate TEXT NOT NULL,
  value_json TEXT NOT NULL,
  extraction_method TEXT NOT NULL CHECK (extraction_method IN ('connector', 'llm', 'admin', 'local_skill')),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'conflicted', 'rejected', 'superseded')),
  fingerprint TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE TABLE feed_candidates (
  id TEXT PRIMARY KEY,
  observation_id TEXT REFERENCES source_observations(id) ON DELETE CASCADE,
  anime_id TEXT REFERENCES anime(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  media_id TEXT REFERENCES media_items(id) ON DELETE SET NULL,
  content_class TEXT NOT NULL CHECK (content_class IN ('schedule', 'official_news', 'official_art', 'creator_art', 'birthday', 'cast_post', 'staff_post', 'fanwork', 'community_thread', 'editorial')),
  source_identity TEXT NOT NULL CHECK (source_identity IN ('official', 'creator', 'cast', 'community', 'editorial')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_account TEXT,
  importance INTEGER NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 5),
  published_at TEXT NOT NULL,
  presentation_mode TEXT NOT NULL DEFAULT 'link_only' CHECK (presentation_mode IN ('link_only', 'platform_embed', 'remote_preview', 'mirrored_with_permission')),
  safety_rating TEXT NOT NULL DEFAULT 'unknown' CHECK (safety_rating IN ('safe', 'suggestive', 'adult', 'unknown')),
  spoiler_level TEXT NOT NULL DEFAULT 'none' CHECK (spoiler_level IN ('none', 'mild', 'major')),
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'held', 'rejected')),
  discovered_by TEXT NOT NULL DEFAULT 'cron',
  extractor_version TEXT NOT NULL DEFAULT 'rules@1',
  policy_version TEXT NOT NULL DEFAULT 'publish-policy@1',
  fingerprint TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE TABLE candidate_evidence (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES feed_candidates(id) ON DELETE CASCADE,
  observation_id TEXT REFERENCES source_observations(id) ON DELETE CASCADE,
  claim_id TEXT REFERENCES claims(id) ON DELETE CASCADE,
  relation TEXT NOT NULL DEFAULT 'supports' CHECK (relation IN ('supports', 'context', 'conflicts')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (observation_id IS NOT NULL OR claim_id IS NOT NULL),
  UNIQUE(candidate_id, observation_id, claim_id, relation)
);

CREATE TABLE feed_items (
  id TEXT PRIMARY KEY,
  candidate_id TEXT UNIQUE REFERENCES feed_candidates(id) ON DELETE SET NULL,
  anime_id TEXT REFERENCES anime(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  media_id TEXT REFERENCES media_items(id) ON DELETE SET NULL,
  content_class TEXT NOT NULL,
  source_identity TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_account TEXT,
  importance INTEGER NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 5),
  published_at TEXT NOT NULL,
  safety_rating TEXT NOT NULL DEFAULT 'safe',
  spoiler_level TEXT NOT NULL DEFAULT 'none',
  auto_published INTEGER NOT NULL DEFAULT 0 CHECK (auto_published IN (0, 1)),
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
  withdrawn_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_decisions (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES feed_candidates(id) ON DELETE CASCADE,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('llm', 'policy', 'admin', 'local_skill')),
  decision TEXT NOT NULL CHECK (decision IN ('publish', 'hold', 'reject', 'withdraw')),
  confidence REAL,
  model TEXT,
  prompt_version TEXT,
  reasons_json TEXT NOT NULL DEFAULT '[]',
  output_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_cache (
  input_fingerprint TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model TEXT NOT NULL,
  output_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (input_fingerprint, prompt_version, model)
);

CREATE TABLE corrections (
  id TEXT PRIMARY KEY,
  feed_item_id TEXT NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  correction_type TEXT NOT NULL CHECK (correction_type IN ('edit', 'withdraw', 'supersede')),
  reason TEXT NOT NULL,
  replacement_feed_item_id TEXT REFERENCES feed_items(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'llm', 'admin', 'local_skill')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE research_runs (
  id TEXT PRIMARY KEY,
  external_batch_id TEXT UNIQUE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('cron', 'admin', 'local_skill')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  source_count INTEGER NOT NULL DEFAULT 0,
  observation_count INTEGER NOT NULL DEFAULT 0,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  published_count INTEGER NOT NULL DEFAULT 0,
  held_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  job_count INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'llm', 'admin', 'local_skill')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anime_season ON anime(season_id, featured DESC, premiere_at);
CREATE INDEX idx_broadcast_weekday ON broadcast_slots(weekday, local_time);
CREATE INDEX idx_events_date ON events(starts_at, event_type);
CREATE INDEX idx_character_birthday ON characters(birthday_month, birthday_day);
CREATE INDEX idx_feed_items_anime ON feed_items(anime_id, published_at DESC);
CREATE INDEX idx_feed_items_public ON feed_items(withdrawn_at, published_at DESC);
CREATE INDEX idx_candidates_status ON feed_candidates(status, importance DESC, published_at DESC);
CREATE INDEX idx_sources_due ON research_sources(enabled, next_check_at, lease_until);
CREATE INDEX idx_observations_source ON source_observations(source_id, captured_at DESC);
CREATE INDEX idx_claims_subject ON claims(subject_type, subject_id, predicate, status);
CREATE INDEX idx_claims_observation ON claims(observation_id, created_at DESC);
CREATE INDEX idx_jobs_due ON update_jobs(status, execution_target, scheduled_at, priority DESC);
CREATE UNIQUE INDEX idx_jobs_active_dedupe ON update_jobs(dedupe_key)
  WHERE status IN ('planned', 'leased', 'running', 'retry');
CREATE INDEX idx_candidate_evidence ON candidate_evidence(candidate_id, relation);
CREATE INDEX idx_review_candidate ON review_decisions(candidate_id, created_at DESC);
CREATE INDEX idx_corrections_feed ON corrections(feed_item_id, created_at DESC);
