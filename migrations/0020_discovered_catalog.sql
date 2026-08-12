INSERT INTO anime (
  id, season_id, slug, title_zh, title_ja, title_en, synopsis, editorial_note,
  yuri_kind, yuri_status, status, premiere_at, episode_count, episode_duration_min,
  studio, source_material, official_url, bangumi_url, official_x_url,
  cover_url, cover_source_url, visual_theme, featured
) VALUES
  (
    'anime-futsutsuka', 'season-2026-summer', 'futsutsuka-akujo',
    '恶女不才，请多关照 ～雏宫蝶鼠换身传～', 'ふつつかな悪女ではございますが ～雛宮蝶鼠とりかえ伝～',
    'Though I Am an Inept Villainess',
    '雏宫中的黄玲琳与朱慧月交换身体。被推入绝境的玲琳凭借强韧心性改变处境，也让慧月对她的看法逐渐动摇。',
    NULL, 'strong', 'pending', 'airing', '2026-07-12T23:45:00+09:00', 11, 24,
    '动画工房', '轻小说', 'https://futsutsuka.net/', 'https://bgm.tv/subject/545008',
    'https://x.com/futsutsuka_PR',
    'https://lain.bgm.tv/r/400/pic/cover/l/14/a1/545008_pNnzQ.jpg',
    'https://bgm.tv/subject/545008', 'rose', 0
  ),
  (
    'anime-magilumiere-2', 'season-2026-summer', 'magilumiere-2',
    '魔法光源股份有限公司 第二季', '株式会社マジルミエ 第2期',
    'Magilumiere Magical Girls Inc. Season 2',
    '把魔法少女当作职业的公司继续承接怪异退治工作。樱木加奈、越谷仁美与同事们面对新的委托、组织和魔法少女。',
    NULL, 'adjacent', 'confirmed', 'airing', '2026-07-05T01:05:00+09:00', 12, 24,
    'J.C.STAFF', '漫画', 'https://magilumiere-pr.com/', 'https://bgm.tv/subject/529723',
    'https://x.com/MagilumiereLtd',
    'https://lain.bgm.tv/r/400/pic/cover/l/28/ae/529723_9qSo4.jpg',
    'https://bgm.tv/subject/529723', 'violet', 0
  ),
  (
    'anime-dodge-danko', 'season-2026-summer', 'dodge-danko',
    '斗球女弹子', '炎の闘球女 ドッジ弾子', 'Dodge Danko',
    '继承父亲斗球之魂的一击弹子召集伙伴重建球川斗球部，与各地女子队伍展开全力对决。',
    NULL, 'adjacent', 'confirmed', 'airing', '2026-07-06T23:00:00+09:00', 12, 24,
    'CUE', '漫画', 'https://dodge-danko.com/', 'https://bgm.tv/subject/569671',
    'https://x.com/dodge_danko',
    'https://lain.bgm.tv/r/400/pic/cover/l/5a/fe/569671_0HZvf.jpg',
    'https://bgm.tv/subject/569671', 'orange', 0
  ),
  (
    'anime-plannosaurus', 'season-2026-summer', 'plannosaurus',
    'Plannosaurus：硬核古生物部', 'プラノサウルス ガチコセイブツ部',
    'Plannosaurus Gachi Koseibutsu-bu',
    '古生物爱好者北谷特托里与以偶像为目标的中里栞奈，在神秘的迪诺陪伴下探索恐龙与古生物。',
    NULL, 'adjacent', 'confirmed', 'airing', '2026-07-12T07:00:00+09:00', 12, 5,
    'SMDE', '原创企划', 'https://www.tv-tokyo.co.jp/anime/plannosaurus/',
    'https://bgm.tv/subject/633711', NULL,
    'https://lain.bgm.tv/r/400/pic/cover/l/ea/4c/633711_V28UU.jpg',
    'https://bgm.tv/subject/633711', 'blue', 0
  );

INSERT OR IGNORE INTO accounts (
  id, owner_type, owner_id, platform, handle, url, verified, monitor_mode,
  verification_source_url, verified_at
) VALUES
  (
    'account-futsutsuka-x', 'anime', 'anime-futsutsuka', 'X', '@futsutsuka_PR',
    'https://x.com/futsutsuka_PR', 1, 'local', 'https://futsutsuka.net/', CURRENT_TIMESTAMP
  ),
  (
    'account-magilumiere-x', 'anime', 'anime-magilumiere-2', 'X', '@MagilumiereLtd',
    'https://x.com/MagilumiereLtd', 1, 'local', 'https://magilumiere-pr.com/', CURRENT_TIMESTAMP
  ),
  (
    'account-dodge-x', 'anime', 'anime-dodge-danko', 'X', '@dodge_danko',
    'https://x.com/dodge_danko', 1, 'local',
    'https://dodge-danko.com/news/detail.php?id=1131517', CURRENT_TIMESTAMP
  );

INSERT INTO broadcast_slots (
  id, anime_id, label, weekday, local_time, timezone, platform_url, is_primary
) VALUES
  (
    'slot-futsutsuka', 'anime-futsutsuka', '东京电视台系', 0, '23:45',
    'Asia/Tokyo', 'https://futsutsuka.net/onair/', 1
  ),
  (
    'slot-magilumiere-2', 'anime-magilumiere-2', '日本电视台系', 6, '24:55',
    'Asia/Tokyo', 'https://magilumiere-pr.com/', 1
  ),
  (
    'slot-dodge-danko', 'anime-dodge-danko', 'TOKYO MX / MBS / BS11', 1, '23:00',
    'Asia/Tokyo', 'https://dodge-danko.com/onair/', 1
  ),
  (
    'slot-plannosaurus', 'anime-plannosaurus', '东京电视台系', 0, '07:00',
    'Asia/Tokyo', 'https://www.tv-tokyo.co.jp/anime/plannosaurus/', 1
  );

INSERT INTO events (
  id, anime_id, event_type, title, starts_at, timezone, source_url, verified
) VALUES
  (
    'event-futsutsuka-premiere', 'anime-futsutsuka', 'broadcast', '第 1 话首播',
    '2026-07-12T23:45:00+09:00', 'Asia/Tokyo', 'https://futsutsuka.net/', 1
  ),
  (
    'event-magilumiere-2-premiere', 'anime-magilumiere-2', 'broadcast', '第 1 话首播',
    '2026-07-05T01:05:00+09:00', 'Asia/Tokyo', 'https://magilumiere-pr.com/', 1
  ),
  (
    'event-dodge-danko-premiere', 'anime-dodge-danko', 'broadcast', '第 1 话首播',
    '2026-07-06T23:00:00+09:00', 'Asia/Tokyo',
    'https://dodge-danko.com/news/detail.php?id=1133172', 1
  ),
  (
    'event-plannosaurus-premiere', 'anime-plannosaurus', 'broadcast', '第 1 话首播',
    '2026-07-12T07:00:00+09:00', 'Asia/Tokyo',
    'https://www.tv-tokyo.co.jp/anime/plannosaurus/', 1
  );

INSERT OR IGNORE INTO discussions (
  id, anime_id, platform, title, url, note, last_activity_at, last_checked_at
) VALUES
  (
    'discussion-futsutsuka-bgm', 'anime-futsutsuka', 'Bangumi', '条目讨论版',
    'https://bgm.tv/subject/545008/board', NULL, NULL, CURRENT_TIMESTAMP
  ),
  (
    'discussion-magilumiere-2-bgm', 'anime-magilumiere-2', 'Bangumi', '条目讨论版',
    'https://bgm.tv/subject/529723/board', NULL, NULL, CURRENT_TIMESTAMP
  ),
  (
    'discussion-dodge-danko-bgm', 'anime-dodge-danko', 'Bangumi', '条目讨论版',
    'https://bgm.tv/subject/569671/board', NULL, NULL, CURRENT_TIMESTAMP
  ),
  (
    'discussion-plannosaurus-bgm', 'anime-plannosaurus', 'Bangumi', '条目讨论版',
    'https://bgm.tv/subject/633711/board', NULL, NULL, CURRENT_TIMESTAMP
  );

INSERT OR IGNORE INTO research_sources (
  id, anime_id, account_id, source_type, change_kind, label, url, trust_level,
  poll_interval_min, cadence_profile, next_check_at
) VALUES
  (
    'source-futsutsuka-news', 'anime-futsutsuka', NULL, 'official_page', 'feed_candidate',
    '动画公式 NEWS', 'https://futsutsuka.net/news/', 'official', 720, 'local', CURRENT_TIMESTAMP
  ),
  (
    'source-futsutsuka-bgm', 'anime-futsutsuka', NULL, 'bangumi', 'catalog_metadata',
    'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/545008', 'community', 1440, 'local', CURRENT_TIMESTAMP
  ),
  (
    'source-magilumiere-2-news', 'anime-magilumiere-2', NULL, 'official_page', 'feed_candidate',
    '动画公式 NEWS', 'https://magilumiere-pr.com/news/', 'official', 720, 'local', CURRENT_TIMESTAMP
  ),
  (
    'source-magilumiere-2-bgm', 'anime-magilumiere-2', NULL, 'bangumi', 'catalog_metadata',
    'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/529723', 'community', 1440, 'local', CURRENT_TIMESTAMP
  ),
  (
    'source-dodge-danko-news', 'anime-dodge-danko', NULL, 'official_page', 'feed_candidate',
    '动画公式 NEWS', 'https://dodge-danko.com/news/', 'official', 720, 'local', CURRENT_TIMESTAMP
  ),
  (
    'source-dodge-danko-bgm', 'anime-dodge-danko', NULL, 'bangumi', 'catalog_metadata',
    'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/569671', 'community', 1440, 'local', CURRENT_TIMESTAMP
  ),
  (
    'source-plannosaurus-official', 'anime-plannosaurus', NULL, 'official_page', 'catalog_metadata',
    '东京电视台公式页', 'https://www.tv-tokyo.co.jp/anime/plannosaurus/', 'official', 1440, 'local', CURRENT_TIMESTAMP
  ),
  (
    'source-plannosaurus-bgm', 'anime-plannosaurus', NULL, 'bangumi', 'catalog_metadata',
    'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/633711', 'community', 1440, 'local', CURRENT_TIMESTAMP
  );
