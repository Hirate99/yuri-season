INSERT OR IGNORE INTO research_sources (
  id, anime_id, account_id, source_type, label, url, trust_level,
  poll_interval_min, cadence_profile, next_check_at, change_kind
) VALUES
  ('source-grow-news', 'anime-grow-up-show', NULL, 'official_page', '动画公式 NEWS', 'https://growupshow.com/news/', 'official', 720, 'local', CURRENT_TIMESTAMP, 'feed_candidate'),
  ('source-draw-bd', 'anime-korekaite', NULL, 'official_page', '动画公式 Blu-ray', 'https://www.vap.co.jp/korekaite-shine/bd/', 'official', 1440, 'local', CURRENT_TIMESTAMP, 'feed_candidate'),
  ('source-draw-frame', 'anime-korekaite', NULL, 'official_page', '动画公式特别内容', 'https://www.vap.co.jp/korekaite-shine/special/frame/', 'official', 1440, 'local', CURRENT_TIMESTAMP, 'feed_candidate');

UPDATE feed_items
SET withdrawn_at = COALESCE(withdrawn_at, CURRENT_TIMESTAMP)
WHERE id = 'feed-kimi-radio';

UPDATE events
SET status = 'cancelled', verified = 0
WHERE id = 'event-kimi-radio';

INSERT OR IGNORE INTO events (
  id, anime_id, event_type, title, starts_at, ends_at, timezone, source_url, verified
) VALUES
  ('event-nanoha-tokyo-bath', 'anime-nanoha-exceeds', 'event', '奈叶 EXCEEDS × 东京钱汤', '2026-08-14', '2026-09-13', 'Asia/Tokyo', 'https://www.nanoha.com/EXGV/news/#news260719', 1),
  ('event-azur-maidreamin', 'anime-azurlane-bisoku-2', 'event', '碧蓝航线微速前行 × maidreamin 联动咖啡', '2026-08-17', NULL, 'Asia/Tokyo', 'https://2nd.azurlane-bisoku.jp/news/4094', 1),
  ('event-yume-live-day1', 'anime-yumemita', 'event', '新宿着陆计划 DAY1', '2026-08-22T18:30:00+09:00', NULL, 'Asia/Tokyo', 'https://anime.bang-dream.com/yumemita/news/post-8', 1),
  ('event-nanoha-lyrical-store-osaka', 'anime-nanoha-exceeds', 'event', 'Lyrical Store 2026 大阪会场', '2026-08-22', '2026-09-06', 'Asia/Tokyo', 'https://www.nanoha.com/EXGV/news/#news260724', 1),
  ('event-yume-live-day2', 'anime-yumemita', 'event', '新宿着陆计划 DAY2', '2026-09-25T19:30:00+09:00', NULL, 'Asia/Tokyo', 'https://anime.bang-dream.com/yumemita/news/post-9', 1),
  ('event-draw-bluray', 'anime-korekaite', 'release', '《画完这个再去死》Blu-ray 发售', '2026-12-13', NULL, 'Asia/Tokyo', 'https://www.vap.co.jp/korekaite-shine/bd/', 1);
