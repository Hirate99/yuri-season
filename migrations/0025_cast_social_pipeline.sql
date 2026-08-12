ALTER TABLE feed_candidates ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE feed_candidates ADD COLUMN platform_object_id TEXT;
ALTER TABLE feed_candidates ADD COLUMN origin_key TEXT;

CREATE UNIQUE INDEX idx_feed_candidates_origin_key
  ON feed_candidates(origin_key)
  WHERE origin_key IS NOT NULL;

CREATE INDEX idx_feed_candidates_account
  ON feed_candidates(account_id, anime_id, published_at DESC);

ALTER TABLE feed_items ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE feed_items ADD COLUMN platform_object_id TEXT;
ALTER TABLE feed_items ADD COLUMN origin_key TEXT;

CREATE INDEX idx_feed_items_account
  ON feed_items(account_id, anime_id, published_at DESC);
