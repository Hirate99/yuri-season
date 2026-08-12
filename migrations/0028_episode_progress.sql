ALTER TABLE anime ADD COLUMN premiere_episode_count INTEGER NOT NULL DEFAULT 1
  CHECK (premiere_episode_count BETWEEN 1 AND 1000);
ALTER TABLE anime ADD COLUMN latest_verified_episode INTEGER
  CHECK (latest_verified_episode IS NULL OR latest_verified_episode BETWEEN 1 AND 1000);
ALTER TABLE anime ADD COLUMN latest_episode_source_url TEXT;
ALTER TABLE anime ADD COLUMN latest_episode_checked_at TEXT;

-- The first YUME∞MITA broadcast and simultaneous stream contained episodes 1–3.
UPDATE anime SET premiere_episode_count = 3
WHERE id = 'anime-yumemita';

-- Only persist an explicit value when the first-party STORY page exposes an
-- episode already broadcast. Other airing works keep the schedule estimate.
UPDATE anime SET
  latest_verified_episode = 6,
  latest_episode_source_url = 'https://growupshow.com/story/',
  latest_episode_checked_at = '2026-08-12T00:00:00+09:00'
WHERE id = 'anime-grow-up-show';

UPDATE anime SET
  latest_verified_episode = 6,
  latest_episode_source_url = 'https://www.vap.co.jp/korekaite-shine/story/',
  latest_episode_checked_at = '2026-08-12T00:00:00+09:00'
WHERE id = 'anime-korekaite';

UPDATE anime SET
  latest_verified_episode = 6,
  latest_episode_source_url = 'https://www.kimishinu-anime.com/story/',
  latest_episode_checked_at = '2026-08-12T00:00:00+09:00'
WHERE id = 'anime-kimishinu';
