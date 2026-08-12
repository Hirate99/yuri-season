UPDATE feed_items
SET summary = '官方公开 CAPCOM 协力与联动内容。'
WHERE id = 'feed-tai-sf6';

INSERT OR IGNORE INTO media_items (
  id, anime_id, content_class, title, creator_name, creator_url,
  original_url, presentation_mode, safety_rating, spoiler_level,
  rights_note, published_at
) VALUES (
  'media-lara-newtype-august',
  'anime-goodbye-lara',
  'official_art',
  '《Newtype》8 月号新绘插图',
  '动画公式 / 月刊ニュータイプ',
  'https://x.com/goodbye_lara',
  'https://webnewtype.com/news/info/entry-47461.html?images_list=1',
  'link_only',
  'safe',
  'none',
  '仅索引官方发布页，不镜像杂志图像。',
  '2026-07-10T12:00:00+09:00'
);

INSERT OR IGNORE INTO feed_items (
  id, anime_id, media_id, content_class, source_identity, title, summary,
  url, source_name, source_account, importance, published_at,
  safety_rating, spoiler_level, auto_published, is_pinned
) VALUES (
  'feed-lara-newtype-august',
  'anime-goodbye-lara',
  'media-lara-newtype-august',
  'official_art',
  'official',
  '《Newtype》8 月号新绘插图',
  '杂志刊载水中的菈菈新绘插图与小出卓史监督访谈。',
  'https://webnewtype.com/news/info/entry-47461.html?images_list=1',
  '动画公式 / 月刊ニュータイプ',
  '@Goodbye_Lara',
  3,
  '2026-07-10T12:00:00+09:00',
  'safe',
  'none',
  0,
  0
);

INSERT OR IGNORE INTO research_sources (
  id, anime_id, source_type, label, url, trust_level,
  poll_interval_min, cadence_profile, next_check_at
) VALUES (
  'source-lara-news',
  'anime-goodbye-lara',
  'official_page',
  '公式 NEWS',
  'https://goodbyelara.com/news/',
  'official',
  720,
  'local',
  CURRENT_TIMESTAMP
);
