ALTER TABLE anime ADD COLUMN yuri_status TEXT NOT NULL DEFAULT 'confirmed'
  CHECK (yuri_status IN ('confirmed', 'pending'));

INSERT INTO anime (
  id, season_id, slug, title_zh, title_ja, title_en, synopsis, editorial_note,
  yuri_kind, yuri_status, status, premiere_at, episode_count, episode_duration_min,
  studio, source_material, official_url, bangumi_url, official_x_url,
  cover_url, cover_source_url, visual_theme, featured
) VALUES
  (
    'anime-grow-up-show', 'season-2026-summer', 'grow-up-show',
    '向日葵马戏团', 'グロウアップショウ ～ひまわりのサーカス団～', 'Grow Up Show',
    '昭和30年代，天才杂技少女鹤卷瑞佳加入四处巡演、长期缺钱的向日葵马戏团。少女们以世界级马戏祭典为目标，在共同生活与舞台训练中逐渐成为伙伴。',
    NULL, 'strong', 'confirmed', 'airing', '2026-07-05T00:00:00+09:00', 13, 24,
    'A-1 Pictures / Psyde Kick Studio', '原创', 'https://growupshow.com/',
    'https://bgm.tv/subject/570583', 'https://x.com/growupshow',
    'https://lain.bgm.tv/r/400/pic/cover/l/0c/cf/570583_d3QZD.jpg',
    'https://bgm.tv/subject/570583', 'amber', 0
  ),
  (
    'anime-goodbye-lara', 'season-2026-summer', 'goodbye-lara',
    '再见菈菈', 'さよならララ', 'Goodbye, Lara',
    '两百年前化作泡沫的人鱼公主菈菈在琵琶湖苏醒，并住进女高中生拳击手大津茉里的家。她再次寻找“真正的爱”，但故事最终是否走向百合关系仍待作品确认。',
    NULL, 'strong', 'pending', 'airing', '2026-07-06T00:30:00+09:00', 12, 24,
    'Kinema citrus', '原创', 'https://goodbyelara.com/',
    'https://bgm.tv/subject/495291', 'https://x.com/goodbye_lara',
    'https://lain.bgm.tv/r/400/pic/cover/l/18/af/495291_9WuBW.jpg',
    'https://bgm.tv/subject/495291', 'lake', 0
  );

INSERT OR IGNORE INTO people (id, name, name_native, primary_kind) VALUES
  ('person-kamei-kanta', '龟井干太', '亀井幹太', 'staff'),
  ('person-misaki-kurehito', '深崎暮人', '深崎暮人', 'staff'),
  ('person-kikuchi-takeshi', '菊池武', '菊池たけし', 'staff'),
  ('person-makino-kazutoshi', '牧野和俊', '牧野和俊', 'staff'),
  ('person-takahashi-satsuki', '高桥皋月', '髙橋さつき', 'staff'),
  ('person-kanno-yugo', '菅野祐悟', '菅野祐悟', 'staff'),
  ('person-noda-tomoka', '野田朋花', '野田朋花', 'cast'),
  ('person-kurosaki-shiori', '黑崎诗织', '黒崎しおり', 'cast'),
  ('person-osanai-reo', '小山内怜央', '小山内怜央', 'cast'),
  ('person-ando-nanako', '安堂奈奈子', '安堂ななこ', 'cast'),
  ('person-kusunoki-tomori', '楠木灯', '楠木ともり', 'cast'),
  ('person-natsuyoshi-yuko', '夏吉优子', '夏吉ゆうこ', 'cast'),
  ('person-kamakura-yuna', '镰仓有那', '鎌倉有那', 'cast'),
  ('person-iwahashi-yuka', '岩桥由佳', '岩橋由佳', 'cast'),
  ('person-kugimiya-rie', '钉宫理惠', '釘宮理恵', 'cast'),
  ('person-koide-takushi', '小出卓史', '小出卓史', 'staff'),
  ('person-kawahara-anna', '川原杏奈', '川原杏奈', 'staff'),
  ('person-tani-shiori', '谷紫织', '谷 紫織', 'staff'),
  ('person-yamaguchi-yuma', 'yuma yamaguchi', 'yuma yamaguchi', 'staff'),
  ('person-hishikawa-hana', '菱川花菜', '菱川花菜', 'cast'),
  ('person-kawaishi-nana', '川石奈奈', '川石奈奈', 'cast'),
  ('person-fukami-rika', '深见梨加', '深見梨加', 'cast'),
  ('person-murase-ayumu', '村濑步', '村瀬 歩', 'cast'),
  ('person-ono-tomohiro', '大野智敬', '大野智敬', 'cast'),
  ('person-madono-mitsuaki', '真殿光昭', '真殿光昭', 'cast'),
  ('person-sumitomo-nanae', '住友七绘', '住友七絵', 'cast'),
  ('person-terasoma-masaki', '寺杣昌纪', 'てらそままさき', 'cast'),
  ('person-tsuda-minami', '津田美波', '津田美波', 'cast'),
  ('person-yamamoto-kazutomi', '山本和臣', '山本和臣', 'cast');

INSERT OR IGNORE INTO characters (
  id, anime_id, name, name_native, profile, birthday_month, birthday_day,
  birthday_source_url, birthday_verified, sort_order
) VALUES
  ('char-grow-mizuka', 'anime-grow-up-show', '鹤卷瑞佳', '鶴巻瑞佳', '身体能力出众的马戏天才。', 9, 25, 'https://growupshow.com/', 1, 1),
  ('char-grow-oka', 'anime-grow-up-show', '川澄樱翔', '川澄桜翔', '向日葵马戏团的空中飞人。', 8, 8, 'https://growupshow.com/', 1, 2),
  ('char-grow-imari', 'anime-grow-up-show', '吾野伊万里', '吾野伊万里', '内向而关心伙伴的魔术师。', 10, 31, 'https://growupshow.com/', 1, 3),
  ('char-grow-isuzu', 'anime-grow-up-show', '五十土五十铃', '五十土五十鈴', '直率好胜的杂技演员。', 8, 15, 'https://growupshow.com/', 1, 4),
  ('char-grow-aoi', 'anime-grow-up-show', '由良葵', '由良 葵', '与双胞胎妹妹茜搭档的杂技演员。', 3, 20, 'https://growupshow.com/', 1, 5),
  ('char-grow-akane', 'anime-grow-up-show', '由良茜', '由良 茜', '非常喜欢姐姐葵的双胞胎妹妹。', 3, 20, 'https://growupshow.com/', 1, 6),
  ('char-grow-shizuku', 'anime-grow-up-show', '酒匂雫', '酒匂 雫', '负责接住空中飞人的捕手。', 11, 30, 'https://growupshow.com/', 1, 7),
  ('char-grow-svetlana', 'anime-grow-up-show', '斯维特拉娜', 'スヴェトラーナ', '表演空中绸吊的资深团员。', 3, 21, 'https://growupshow.com/', 1, 8),
  ('char-grow-rin', 'anime-grow-up-show', '间宫凛', '間宮 凛', '负责马戏团财务、医疗与餐食。', 7, 15, 'https://growupshow.com/', 1, 9),
  ('char-grow-maria', 'anime-grow-up-show', '麻利亚', '麻利亜', '向日葵马戏团团长。', 3, 7, 'https://growupshow.com/', 1, 10),
  ('char-lara-lara', 'anime-goodbye-lara', '菈菈', 'ララ', '两百年后在琵琶湖复活的人鱼公主。', NULL, NULL, NULL, 0, 1),
  ('char-lara-mari', 'anime-goodbye-lara', '大津茉里', '大津茉里', '住在大津市的女高中生拳击手。', NULL, NULL, NULL, 0, 2),
  ('char-lara-grace', 'anime-goodbye-lara', '格蕾丝', 'グレイス', '曾把菈菈变成人类的魔女。', NULL, NULL, NULL, 0, 3),
  ('char-lara-luca', 'anime-goodbye-lara', '卢卡', 'ルカ', '长得很像菈菈两百年前爱上的王子。', NULL, NULL, NULL, 0, 4),
  ('char-lara-yoshiya', 'anime-goodbye-lara', '大津祥弥', '大津祥弥', '茉里的哥哥。', NULL, NULL, NULL, 0, 5),
  ('char-lara-makoto', 'anime-goodbye-lara', '大津诚', '大津 誠', '茉里的父亲。', NULL, NULL, NULL, 0, 6),
  ('char-lara-ema', 'anime-goodbye-lara', '大津江万', '大津江万', '茉里的祖母。', NULL, NULL, NULL, 0, 7),
  ('char-lara-rowan', 'anime-goodbye-lara', '罗文', 'ローワン', '海之王、菈菈姐妹的父亲。', NULL, NULL, NULL, 0, 8),
  ('char-lara-lisa', 'anime-goodbye-lara', '莉萨', 'リサ', '菈菈的四姐。', NULL, NULL, NULL, 0, 9),
  ('char-lara-kota', 'anime-goodbye-lara', '幸太', 'コータ', NULL, NULL, NULL, NULL, 0, 10);

INSERT OR IGNORE INTO work_credits (id, anime_id, person_id, role, sort_order) VALUES
  ('credit-grow-1', 'anime-grow-up-show', 'person-kamei-kanta', '监督', 1),
  ('credit-grow-2', 'anime-grow-up-show', 'person-misaki-kurehito', '角色原案', 2),
  ('credit-grow-3', 'anime-grow-up-show', 'person-kikuchi-takeshi', '系列构成', 3),
  ('credit-grow-4', 'anime-grow-up-show', 'person-makino-kazutoshi', '角色设计 / 总作画监督', 4),
  ('credit-grow-5', 'anime-grow-up-show', 'person-takahashi-satsuki', '副监督', 5),
  ('credit-grow-6', 'anime-grow-up-show', 'person-kanno-yugo', '音乐', 6),
  ('credit-lara-1', 'anime-goodbye-lara', 'person-koide-takushi', '监督', 1),
  ('credit-lara-2', 'anime-goodbye-lara', 'person-kawahara-anna', '系列构成', 2),
  ('credit-lara-3', 'anime-goodbye-lara', 'person-tani-shiori', '角色设计', 3),
  ('credit-lara-4', 'anime-goodbye-lara', 'person-yamaguchi-yuma', '音乐', 4);

INSERT OR IGNORE INTO cast_credits (id, anime_id, character_id, person_id, sort_order) VALUES
  ('cast-grow-1', 'anime-grow-up-show', 'char-grow-mizuka', 'person-noda-tomoka', 1),
  ('cast-grow-2', 'anime-grow-up-show', 'char-grow-oka', 'person-kurosaki-shiori', 2),
  ('cast-grow-3', 'anime-grow-up-show', 'char-grow-imari', 'person-osanai-reo', 3),
  ('cast-grow-4', 'anime-grow-up-show', 'char-grow-isuzu', 'person-ando-nanako', 4),
  ('cast-grow-5', 'anime-grow-up-show', 'char-grow-aoi', 'person-kusunoki-tomori', 5),
  ('cast-grow-6', 'anime-grow-up-show', 'char-grow-akane', 'person-natsuyoshi-yuko', 6),
  ('cast-grow-7', 'anime-grow-up-show', 'char-grow-shizuku', 'person-kamakura-yuna', 7),
  ('cast-grow-8', 'anime-grow-up-show', 'char-grow-svetlana', 'person-iwahashi-yuka', 8),
  ('cast-grow-9', 'anime-grow-up-show', 'char-grow-rin', 'person-kayano-ai', 9),
  ('cast-grow-10', 'anime-grow-up-show', 'char-grow-maria', 'person-kugimiya-rie', 10),
  ('cast-lara-1', 'anime-goodbye-lara', 'char-lara-lara', 'person-hishikawa-hana', 1),
  ('cast-lara-2', 'anime-goodbye-lara', 'char-lara-mari', 'person-kawaishi-nana', 2),
  ('cast-lara-3', 'anime-goodbye-lara', 'char-lara-grace', 'person-fukami-rika', 3),
  ('cast-lara-4', 'anime-goodbye-lara', 'char-lara-luca', 'person-murase-ayumu', 4),
  ('cast-lara-5', 'anime-goodbye-lara', 'char-lara-yoshiya', 'person-ono-tomohiro', 5),
  ('cast-lara-6', 'anime-goodbye-lara', 'char-lara-makoto', 'person-madono-mitsuaki', 6),
  ('cast-lara-7', 'anime-goodbye-lara', 'char-lara-ema', 'person-sumitomo-nanae', 7),
  ('cast-lara-8', 'anime-goodbye-lara', 'char-lara-rowan', 'person-terasoma-masaki', 8),
  ('cast-lara-9', 'anime-goodbye-lara', 'char-lara-lisa', 'person-tsuda-minami', 9),
  ('cast-lara-10', 'anime-goodbye-lara', 'char-lara-kota', 'person-yamamoto-kazutomi', 10);

INSERT OR IGNORE INTO accounts (id, owner_type, owner_id, platform, handle, url, verified, monitor_mode) VALUES
  ('account-grow-x', 'anime', 'anime-grow-up-show', 'X', '@growupshow', 'https://x.com/growupshow', 1, 'local'),
  ('account-lara-x', 'anime', 'anime-goodbye-lara', 'X', '@goodbye_lara', 'https://x.com/goodbye_lara', 1, 'local');

INSERT INTO broadcast_slots (id, anime_id, label, weekday, local_time, timezone, platform_url, is_primary) VALUES
  ('slot-grow', 'anime-grow-up-show', 'TOKYO MX / BS11', 6, '24:00', 'Asia/Tokyo', 'https://growupshow.com/onair/', 1),
  ('slot-lara', 'anime-goodbye-lara', 'TOKYO MX', 0, '24:30', 'Asia/Tokyo', 'https://goodbyelara.com/onair/', 1);

INSERT INTO events (id, anime_id, character_id, event_type, title, starts_at, timezone, recurrence_rule, source_url, verified) VALUES
  ('event-grow-premiere', 'anime-grow-up-show', NULL, 'broadcast', '第 1 话首播', '2026-07-05T00:00:00+09:00', 'Asia/Tokyo', NULL, 'https://growupshow.com/onair/', 1),
  ('event-lara-premiere', 'anime-goodbye-lara', NULL, 'broadcast', '第 1 话首播', '2026-07-06T00:30:00+09:00', 'Asia/Tokyo', NULL, 'https://goodbyelara.com/onair/', 1),
  ('birthday-grow-mizuka', 'anime-grow-up-show', 'char-grow-mizuka', 'birthday', '鹤卷瑞佳生日', '2026-09-25T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-oka', 'anime-grow-up-show', 'char-grow-oka', 'birthday', '川澄樱翔生日', '2026-08-08T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-imari', 'anime-grow-up-show', 'char-grow-imari', 'birthday', '吾野伊万里生日', '2026-10-31T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-isuzu', 'anime-grow-up-show', 'char-grow-isuzu', 'birthday', '五十土五十铃生日', '2026-08-15T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-aoi', 'anime-grow-up-show', 'char-grow-aoi', 'birthday', '由良葵生日', '2027-03-20T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-akane', 'anime-grow-up-show', 'char-grow-akane', 'birthday', '由良茜生日', '2027-03-20T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-shizuku', 'anime-grow-up-show', 'char-grow-shizuku', 'birthday', '酒匂雫生日', '2026-11-30T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-svetlana', 'anime-grow-up-show', 'char-grow-svetlana', 'birthday', '斯维特拉娜生日', '2027-03-21T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-rin', 'anime-grow-up-show', 'char-grow-rin', 'birthday', '间宫凛生日', '2027-07-15T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1),
  ('birthday-grow-maria', 'anime-grow-up-show', 'char-grow-maria', 'birthday', '麻利亚生日', '2027-03-07T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY', 'https://growupshow.com/', 1);

INSERT OR IGNORE INTO discussions (id, anime_id, platform, title, url, note, last_activity_at, last_checked_at) VALUES
  ('discussion-grow-yamibo', 'anime-grow-up-show', '百合会', '向日葵马戏团集中讨论', 'https://bbs.yamibo.com/thread-573280-1-1.html', NULL, NULL, CURRENT_TIMESTAMP),
  ('discussion-lara-bgm', 'anime-goodbye-lara', 'Bangumi', '百合作可能性？', 'https://bangumi.tv/subject/topic/39056', NULL, NULL, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO research_sources (
  id, anime_id, account_id, source_type, label, url, trust_level,
  poll_interval_min, cadence_profile, next_check_at
) VALUES
  ('source-grow-official', 'anime-grow-up-show', NULL, 'official_page', '公式站', 'https://growupshow.com/', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-grow-onair', 'anime-grow-up-show', NULL, 'official_page', '放送信息', 'https://growupshow.com/onair/', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-grow-bgm', 'anime-grow-up-show', NULL, 'bangumi', 'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/570583', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-grow-yamibo', 'anime-grow-up-show', NULL, 'community', '百合会集中讨论', 'https://bbs.yamibo.com/thread-573280-1-1.html', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-lara-official', 'anime-goodbye-lara', NULL, 'official_page', '公式站', 'https://goodbyelara.com/', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-lara-onair', 'anime-goodbye-lara', NULL, 'official_page', '放送信息', 'https://goodbyelara.com/onair/', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-lara-bgm', 'anime-goodbye-lara', NULL, 'bangumi', 'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/495291', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-lara-bgm-topic', 'anime-goodbye-lara', NULL, 'community', 'Bangumi 百合作讨论', 'https://bangumi.tv/subject/topic/39056', 'community', 1440, 'local', CURRENT_TIMESTAMP);
