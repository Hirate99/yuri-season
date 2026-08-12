CREATE INDEX IF NOT EXISTS idx_broadcast_anime_primary
  ON broadcast_slots(anime_id, is_primary, weekday, local_time);

CREATE INDEX IF NOT EXISTS idx_events_anime_verified
  ON events(anime_id, verified, starts_at, title);

CREATE INDEX IF NOT EXISTS idx_accounts_owner
  ON accounts(owner_type, owner_id, verified DESC, platform);

CREATE INDEX IF NOT EXISTS idx_sources_anime_enabled
  ON research_sources(anime_id, enabled, trust_level, label);

CREATE INDEX IF NOT EXISTS idx_media_anime_safety
  ON media_items(anime_id, safety_rating, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_items_public_page
  ON feed_items(withdrawn_at, is_pinned DESC, published_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_feed_items_anime_page
  ON feed_items(anime_id, withdrawn_at, is_pinned DESC, published_at DESC, id DESC);
