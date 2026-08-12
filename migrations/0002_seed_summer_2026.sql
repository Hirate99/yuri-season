INSERT INTO seasons (id, slug, label, starts_on, ends_on, is_current) VALUES
  ('season-2026-summer', '2026-summer', '2026 夏', '2026-07-01', '2026-09-30', 1);

INSERT INTO anime (
  id, season_id, slug, title_zh, title_ja, title_en, synopsis, editorial_note,
  yuri_kind, status, premiere_at, episode_count, episode_duration_min, studio,
  source_material, official_url, bangumi_url, official_x_url, visual_theme, featured
) VALUES
  (
    'anime-kimishinu', 'season-2026-summer', 'kimishinu', '与你相恋到生命尽头',
    'きみが死ぬまで恋をしたい', 'I Want to Love You Till Your Dying Day',
    '在将孤儿培养为战争兵器的学校里，无法接受死亡成为日常的希娜，遇见了浑身是血却总在微笑的美美。少女之间的爱意，被放在战争、牺牲与“想活下去”的愿望之间。',
    '本季明确百合主线。改编节奏、花田十辉的系列构成，以及 ROLL2 如何处理原作的残酷与轻柔，是最值得持续观察的三个点。',
    'canon', 'airing', '2026-07-08T00:30:00+09:00', 13, 24, 'ROLL2',
    '漫画 · Comic 百合姬', 'https://www.kimishinu-anime.com/', 'https://bgm.tv/subject/541285',
    'https://x.com/anime_kimishinu', 'rose', 1
  ),
  (
    'anime-taiari', 'season-2026-summer', 'taiari', '感谢对战。～大小姐才不会玩格斗游戏～',
    '対ありでした。～お嬢さまは格闘ゲームなんてしない～', 'Young Ladies Don’t Play Fighting Games',
    '以成为优雅大小姐为目标的深月绫，撞见“白百合大人”夜绘美绪在空教室里狂热地打格斗游戏。校规禁止游戏，却挡不住大小姐们想要对战的冲动。',
    '女性关系性与竞技喜剧并重。动画获得《Street Fighter 6》正式协力，格斗场面的可读性和角色之间的火花同样重要。',
    'strong', 'airing', '2026-07-07T23:00:00+09:00', 12, 24, 'diomedéa',
    '漫画 · Comic Flapper', 'https://taiari-anime.com/', 'https://bgm.tv/subject/325767',
    'https://x.com/taiari_anime', 'violet', 1
  ),
  (
    'anime-nanoha-exceeds', 'season-2026-summer', 'nanoha-exceeds', '魔法少女奈叶 EXCEEDS',
    '魔法少女リリカルなのは EXCEEDS Gun Blaze Vengeance', 'Magical Girl Lyrical Nanoha EXCEEDS',
    '《魔法少女奈叶》系列完全新作。奈叶等人在新的组织与战斗框架下，继续面对魔法技术、责任与彼此关系的变化。',
    '属于“长期关系性”观察对象。站点将公式消息和主要声优动态并列展示，不替用户为系列情感浓度下定论。',
    'strong', 'airing', '2026-07-05T01:00:00+09:00', NULL, 24, 'Seven Arcs',
    '原创', 'https://www.nanoha.com/EXGV/', NULL, 'https://x.com/exgv_official', 'blue', 0
  ),
  (
    'anime-azurlane-bisoku-2', 'season-2026-summer', 'azurlane-bisoku-2', '碧蓝航线：微速前行！第二季',
    'アズールレーン びそくぜんしんっ！にっ！！', 'Azur Lane: Slow Ahead! Season 2',
    '以舰船少女们的宿舍、训练与休息日为中心的短篇日常续作，延续轻松群像与角色组合互动。',
    '更接近轻百合与角色关系性索引，因此使用“关联观察”标签，与明确恋爱主线区分。',
    'adjacent', 'airing', '2026-07-06T01:05:00+09:00', NULL, 10, 'Studio CANDY BOX',
    '游戏衍生漫画', 'https://www.azurlane-bisoku.jp/', NULL, 'https://x.com/azurlane_bisoku', 'amber', 0
  );

INSERT INTO people (id, name, name_native, primary_kind) VALUES
  ('person-aono-nachi', 'あおのなち', 'あおのなち', 'author'),
  ('person-tomoda-yasushi', '友田康', '友田 康', 'staff'),
  ('person-hanada-jukki', '花田十辉', '花田 十輝', 'staff'),
  ('person-yufu-kyoko', '油布京子', '油布 京子', 'staff'),
  ('person-takahashi-rie', '高桥李依', '高橋 李依', 'cast'),
  ('person-hidaka-rina', '日高里菜', '日高 里菜', 'cast'),
  ('person-seto-asami', '濑户麻沙美', '瀬戸 麻沙美', 'cast'),
  ('person-ishikawa-yui', '石川由依', '石川 由依', 'cast'),
  ('person-ejima-eri', '江岛绘理', '江島 絵理', 'author'),
  ('person-ibata-shota', '井畑翔太', '井畑 翔太', 'staff'),
  ('person-watari-wataru', '渡航', '渡 航', 'staff'),
  ('person-hasegawa-ikumi', '长谷川育美', '長谷川 育美', 'cast'),
  ('person-ichinose-kana', '市之濑加那', '市ノ瀬 加那', 'cast'),
  ('person-senbongi-sayaka', '千本木彩花', '千本木 彩花', 'cast'),
  ('person-shimoji-shino', '下地紫野', '下地 紫野', 'cast'),
  ('person-tsuzuki-masaki', '都筑真纪', '都築 真紀', 'author'),
  ('person-hamana-takayuki', '滨名孝行', '浜名 孝行', 'staff'),
  ('person-aragaki-kazunari', '新垣一成', '新垣 一成', 'staff');

INSERT INTO characters (
  id, anime_id, name, name_native, profile, birthday_month, birthday_day,
  birthday_source_url, birthday_verified, sort_order
) VALUES
  ('char-sheena', 'anime-kimishinu', '托茨基·希娜', 'トツキ・シーナ', '无法接受死亡成为日常的十四岁少女。', NULL, NULL, NULL, 0, 1),
  ('char-mimi', 'anime-kimishinu', '卡嘉莉·美美', 'カガリ・ミミ', '希娜在夜里遇见的、浑身是血却总在微笑的少女。', NULL, NULL, NULL, 0, 2),
  ('char-lizzy', 'anime-kimishinu', '莉兹·塞兰', 'リジィ・セイラン', NULL, NULL, NULL, NULL, 0, 3),
  ('char-ali', 'anime-kimishinu', '莫德·阿里', 'モード・アリ', NULL, NULL, NULL, NULL, 0, 4),
  ('char-aya', 'anime-taiari', '深月绫', '深月 綾', '憧憬“白百合大人”、同时拥有格斗游戏经验的外部生。', NULL, NULL, NULL, 0, 1),
  ('char-mio', 'anime-taiari', '夜绘美绪', '夜絵 美緒', '被称作“白百合大人”的校园偶像，私下是重度格斗玩家。', NULL, NULL, NULL, 0, 2),
  ('char-yu', 'anime-taiari', '犬井夕', '犬井 夕', NULL, NULL, NULL, NULL, 0, 3),
  ('char-tamaki', 'anime-taiari', '一之濑珠树', '一ノ瀬 珠樹', NULL, NULL, NULL, NULL, 0, 4);

INSERT INTO work_credits (id, anime_id, person_id, role, sort_order) VALUES
  ('credit-kimi-1', 'anime-kimishinu', 'person-aono-nachi', '原作', 1),
  ('credit-kimi-2', 'anime-kimishinu', 'person-tomoda-yasushi', '监督', 2),
  ('credit-kimi-3', 'anime-kimishinu', 'person-hanada-jukki', '系列构成 / 脚本', 3),
  ('credit-kimi-4', 'anime-kimishinu', 'person-yufu-kyoko', '角色设计', 4),
  ('credit-tai-1', 'anime-taiari', 'person-ejima-eri', '原作', 1),
  ('credit-tai-2', 'anime-taiari', 'person-ibata-shota', '监督', 2),
  ('credit-tai-3', 'anime-taiari', 'person-watari-wataru', '系列构成', 3),
  ('credit-nanoha-1', 'anime-nanoha-exceeds', 'person-tsuzuki-masaki', '原作 / 脚本', 1),
  ('credit-nanoha-2', 'anime-nanoha-exceeds', 'person-hamana-takayuki', '监督', 2),
  ('credit-nanoha-3', 'anime-nanoha-exceeds', 'person-aragaki-kazunari', '角色设计 / 总作画监督', 3);

INSERT INTO cast_credits (id, anime_id, character_id, person_id, sort_order) VALUES
  ('cast-kimi-1', 'anime-kimishinu', 'char-sheena', 'person-takahashi-rie', 1),
  ('cast-kimi-2', 'anime-kimishinu', 'char-mimi', 'person-hidaka-rina', 2),
  ('cast-kimi-3', 'anime-kimishinu', 'char-lizzy', 'person-seto-asami', 3),
  ('cast-kimi-4', 'anime-kimishinu', 'char-ali', 'person-ishikawa-yui', 4),
  ('cast-tai-1', 'anime-taiari', 'char-aya', 'person-hasegawa-ikumi', 1),
  ('cast-tai-2', 'anime-taiari', 'char-mio', 'person-ichinose-kana', 2),
  ('cast-tai-3', 'anime-taiari', 'char-yu', 'person-senbongi-sayaka', 3),
  ('cast-tai-4', 'anime-taiari', 'char-tamaki', 'person-shimoji-shino', 4);

INSERT INTO accounts (id, owner_type, owner_id, platform, handle, url, verified, monitor_mode) VALUES
  ('account-kimi-x', 'anime', 'anime-kimishinu', 'X', '@anime_kimishinu', 'https://x.com/anime_kimishinu', 1, 'local'),
  ('account-tai-x', 'anime', 'anime-taiari', 'X', '@taiari_anime', 'https://x.com/taiari_anime', 1, 'local'),
  ('account-nanoha-x', 'anime', 'anime-nanoha-exceeds', 'X', '@exgv_official', 'https://x.com/exgv_official', 1, 'local'),
  ('account-azur-x', 'anime', 'anime-azurlane-bisoku-2', 'X', '@azurlane_bisoku', 'https://x.com/azurlane_bisoku', 1, 'local'),
  ('account-aono-x', 'person', 'person-aono-nachi', 'X', '@aooont', 'https://x.com/aooont', 1, 'local'),
  ('account-rie-x', 'person', 'person-takahashi-rie', 'X', '@taka8rie', 'https://x.com/taka8rie', 1, 'local'),
  ('account-rina-x', 'person', 'person-hidaka-rina', 'X', '@hidaka_rina0615', 'https://x.com/hidaka_rina0615', 1, 'local'),
  ('account-yui-x', 'person', 'person-ishikawa-yui', 'X', '@YUI_STAFF', 'https://x.com/YUI_STAFF', 1, 'local'),
  ('account-kana-x', 'person', 'person-ichinose-kana', 'X', '@ichinose_1220', 'https://x.com/ichinose_1220', 1, 'local'),
  ('account-shino-x', 'person', 'person-shimoji-shino', 'X', '@shimojishino_o', 'https://x.com/shimojishino_o', 1, 'local');

INSERT INTO broadcast_slots (id, anime_id, label, weekday, local_time, timezone, platform_url, is_primary) VALUES
  ('slot-kimishinu', 'anime-kimishinu', 'TOKYO MX / AT-X', 2, '24:30', 'Asia/Tokyo', 'https://www.kimishinu-anime.com/onair/', 1),
  ('slot-taiari', 'anime-taiari', 'TOKYO MX', 2, '23:00', 'Asia/Tokyo', 'https://taiari-anime.com/onair/', 1),
  ('slot-nanoha', 'anime-nanoha-exceeds', 'TOKYO MX / BS11', 6, '25:00', 'Asia/Tokyo', 'https://www.nanoha.com/EXGV/onair/', 1),
  ('slot-azurlane', 'anime-azurlane-bisoku-2', 'TOKYO MX', 0, '25:05', 'Asia/Tokyo', 'https://www.azurlane-bisoku.jp/onair', 1);

INSERT INTO events (id, anime_id, event_type, title, starts_at, timezone, source_url, verified) VALUES
  ('event-kimi-premiere', 'anime-kimishinu', 'broadcast', '第 1 话首播', '2026-07-08T00:30:00+09:00', 'Asia/Tokyo', 'https://www.kimishinu-anime.com/news/20260609_01.html', 1),
  ('event-tai-premiere', 'anime-taiari', 'broadcast', '第 1 话首播', '2026-07-07T23:00:00+09:00', 'Asia/Tokyo', 'https://taiari-anime.com/news/', 1),
  ('event-kimi-radio', 'anime-kimishinu', 'radio', '公式 WEB Radio', '2026-07-10T12:00:00+09:00', 'Asia/Tokyo', 'https://bgm.tv/subject/668601', 1);

INSERT INTO feed_items (
  id, anime_id, event_id, content_class, source_identity, title, summary, url,
  source_name, source_account, importance, published_at, auto_published, is_pinned
) VALUES
  ('feed-kimi-premiere', 'anime-kimishinu', 'event-kimi-premiere', 'schedule', 'official',
    '每周二 24:30 放送', 'AT-X、TOKYO MX、WOWOW 等平台自 7 月 7 日起播出。',
    'https://www.kimishinu-anime.com/news/20260609_01.html', '动画公式', '@anime_kimishinu', 5, '2026-06-09T12:00:00+09:00', 0, 1),
  ('feed-kimi-radio', 'anime-kimishinu', 'event-kimi-radio', 'cast_post', 'official',
    '高桥李依主持公式 WEB Radio', '以希娜役高桥李依为主持的公式广播上线，日高里菜等主要声优参与。',
    'https://bgm.tv/subject/668601', '公式 WEB Radio', '高桥李依', 3, '2026-07-04T12:00:00+09:00', 0, 0),
  ('feed-tai-sf6', 'anime-taiari', NULL, 'official_news', 'official',
    '与 Street Fighter 6 正式联动', '作品公开 CAPCOM 协力与联动内容。',
    'https://taiari-anime.com/news/', '动画公式', '@taiari_anime', 4, '2026-05-30T12:00:00+09:00', 0, 0);

INSERT INTO media_items (
  id, anime_id, person_id, content_class, title, creator_name, creator_url,
  original_url, presentation_mode, safety_rating, spoiler_level, rights_note, published_at
) VALUES
  ('media-kimi-official-key', 'anime-kimishinu', NULL, 'official_art', '第 2 弹主视觉',
    '《きみが死ぬまで恋をしたい》制作委员会', 'https://www.kimishinu-anime.com/',
    'https://www.kimishinu-anime.com/', 'link_only', 'safe', 'none',
    '首版仅链接公式页面，不镜像视觉图。', '2026-06-09T12:00:00+09:00');

INSERT INTO discussions (id, anime_id, platform, title, url, note, last_activity_at, last_checked_at) VALUES
  ('discussion-kimi-bgm', 'anime-kimishinu', 'Bangumi', '条目讨论版', 'https://bgm.tv/subject/541285/board', '单集与改编讨论较集中', '2026-08-10T12:00:00Z', CURRENT_TIMESTAMP),
  ('discussion-kimi-sub', 'anime-kimishinu', 'Bangumi', '字幕组选择集中讨论', 'https://bgm.tv/subject/topic/40436', '包含当季字幕更新信息', '2026-08-10T12:00:00Z', CURRENT_TIMESTAMP),
  ('discussion-tai-bgm', 'anime-taiari', 'Bangumi', '条目讨论版', 'https://bgm.tv/subject/325767/board', '格斗玩家与动画观众交叉讨论', '2026-08-10T12:00:00Z', CURRENT_TIMESTAMP);

INSERT INTO research_sources (
  id, anime_id, account_id, source_type, label, url, trust_level,
  poll_interval_min, cadence_profile, next_check_at
) VALUES
  ('source-kimi-news', 'anime-kimishinu', NULL, 'official_json', '动画公式 NEWS', 'https://www.kimishinu-anime.com/news/newslist.json', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-kimi-bgm', 'anime-kimishinu', NULL, 'bangumi', 'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/541285', 'community', 720, 'local', CURRENT_TIMESTAMP),
  ('source-tai-news', 'anime-taiari', NULL, 'official_json', '动画公式 NEWS', 'https://taiari-anime.com/news/newslist.json', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-tai-bgm', 'anime-taiari', NULL, 'bangumi', 'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/325767', 'community', 720, 'local', CURRENT_TIMESTAMP),
  ('source-nanoha-official', 'anime-nanoha-exceeds', NULL, 'official_page', '动画公式 NEWS', 'https://www.nanoha.com/EXGV/news/', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-azur-official', 'anime-azurlane-bisoku-2', NULL, 'official_json', '动画公式 NEWS', 'https://www.azurlane-bisoku.jp/api/news/list?index=1&size=20', 'official', 720, 'local', CURRENT_TIMESTAMP);
