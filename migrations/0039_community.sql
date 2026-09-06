CREATE TABLE auth_users (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0, image TEXT,
  banned INTEGER NOT NULL DEFAULT 0, last_posted_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX auth_sessions_user ON auth_sessions(user_id);
CREATE TABLE auth_accounts (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, provider_id TEXT NOT NULL, access_token TEXT, refresh_token TEXT,
  id_token TEXT, access_token_expires_at INTEGER, refresh_token_expires_at INTEGER,
  scope TEXT, password TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX auth_accounts_user ON auth_accounts(user_id);
CREATE UNIQUE INDEX auth_accounts_provider ON auth_accounts(provider_id, account_id);
CREATE TABLE auth_verifications (
  id TEXT PRIMARY KEY NOT NULL, identifier TEXT NOT NULL, value TEXT NOT NULL,
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX auth_verifications_identifier ON auth_verifications(identifier);
CREATE TABLE auth_rate_limits (
  id TEXT PRIMARY KEY NOT NULL, key TEXT NOT NULL UNIQUE, count INTEGER NOT NULL, last_request INTEGER NOT NULL
);
CREATE TABLE community_threads (
  id TEXT PRIMARY KEY NOT NULL, anime_id TEXT NOT NULL REFERENCES anime(id),
  author_id TEXT NOT NULL REFERENCES auth_users(id), title TEXT NOT NULL,
  episode INTEGER CHECK(episode IS NULL OR episode BETWEEN 1 AND 999),
  spoiler INTEGER NOT NULL DEFAULT 0, pinned INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, last_activity_at INTEGER NOT NULL
);
CREATE INDEX community_threads_anime ON community_threads(anime_id, hidden, pinned, last_activity_at, id);
CREATE INDEX community_threads_author ON community_threads(author_id, created_at);
CREATE TABLE community_posts (
  id TEXT PRIMARY KEY NOT NULL, thread_id TEXT NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES auth_users(id), body TEXT NOT NULL, floor INTEGER CHECK(floor > 0),
  parent_post_id TEXT REFERENCES community_posts(id),
  reply_to_id TEXT REFERENCES community_posts(id), hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  CHECK ((parent_post_id IS NULL AND floor IS NOT NULL) OR (parent_post_id IS NOT NULL AND floor IS NULL))
);
CREATE UNIQUE INDEX community_posts_floor ON community_posts(thread_id, floor);
CREATE INDEX community_posts_comments ON community_posts(parent_post_id, created_at, id);
CREATE INDEX community_posts_author ON community_posts(author_id, created_at);
CREATE TABLE community_reports (
  id TEXT PRIMARY KEY NOT NULL, post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES auth_users(id), reason TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX community_reports_once ON community_reports(post_id, reporter_id);
CREATE INDEX community_reports_queue ON community_reports(resolved, created_at);
