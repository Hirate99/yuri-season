ALTER TABLE research_sources ADD COLUMN item_url_template TEXT;

UPDATE research_sources
SET url = 'https://www.kimishinu-anime.com/news/newslist.json',
    label = '动画公式 NEWS',
    item_url_template = 'https://www.kimishinu-anime.com/news/{id}.html'
WHERE id = 'source-kimi-news';

UPDATE research_sources
SET url = 'https://taiari-anime.com/news/newslist.json',
    label = '动画公式 NEWS',
    item_url_template = 'https://taiari-anime.com/news/?id={id}'
WHERE id = 'source-tai-news';

UPDATE anime
SET official_url = 'https://www.nanoha.com/EXGV/',
    official_x_url = 'https://x.com/exgv_official'
WHERE id = 'anime-nanoha-exceeds';

INSERT INTO accounts (id, owner_type, owner_id, platform, handle, url, verified, monitor_mode)
VALUES ('account-nanoha-x', 'anime', 'anime-nanoha-exceeds', 'X', '@exgv_official', 'https://x.com/exgv_official', 1, 'local')
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  url = excluded.url,
  verified = excluded.verified,
  monitor_mode = excluded.monitor_mode;

UPDATE broadcast_slots
SET label = 'TOKYO MX / BS11',
    weekday = 6,
    local_time = '25:00',
    platform_url = 'https://www.nanoha.com/EXGV/onair/'
WHERE id = 'slot-nanoha';

UPDATE research_sources
SET url = 'https://www.nanoha.com/EXGV/news/',
    label = '动画公式 NEWS'
WHERE id = 'source-nanoha-official';
