UPDATE anime
SET title_ja = 'アズールレーン びそくぜんしんっ！にっ！！',
    premiere_at = '2026-07-06T01:05:00+09:00',
    studio = 'Studio CANDY BOX',
    official_url = 'https://www.azurlane-bisoku.jp/',
    official_x_url = 'https://x.com/azurlane_staff'
WHERE id = 'anime-azurlane-bisoku-2';

INSERT INTO accounts (id, owner_type, owner_id, platform, handle, url, verified, monitor_mode)
VALUES ('account-azur-x', 'anime', 'anime-azurlane-bisoku-2', 'X', '@azurlane_staff', 'https://x.com/azurlane_staff', 1, 'local')
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  url = excluded.url,
  verified = excluded.verified,
  monitor_mode = excluded.monitor_mode;

UPDATE broadcast_slots
SET label = 'TOKYO MX',
    weekday = 0,
    local_time = '25:05',
    platform_url = 'https://www.azurlane-bisoku.jp/onair'
WHERE id = 'slot-azurlane';

UPDATE research_sources
SET url = 'https://www.azurlane-bisoku.jp/news/',
    label = '动画公式 NEWS'
WHERE id = 'source-azur-official';
