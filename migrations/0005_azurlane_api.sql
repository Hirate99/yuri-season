UPDATE anime
SET official_x_url = 'https://x.com/azurlane_bisoku'
WHERE id = 'anime-azurlane-bisoku-2';

INSERT INTO accounts (id, owner_type, owner_id, platform, handle, url, verified, monitor_mode)
VALUES ('account-azur-x', 'anime', 'anime-azurlane-bisoku-2', 'X', '@azurlane_bisoku', 'https://x.com/azurlane_bisoku', 1, 'local')
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  url = excluded.url,
  verified = excluded.verified,
  monitor_mode = excluded.monitor_mode;

UPDATE research_sources
SET url = 'https://www.azurlane-bisoku.jp/api/news/list?index=1&size=100',
    label = '动画公式 NEWS'
WHERE id = 'source-azur-official';
