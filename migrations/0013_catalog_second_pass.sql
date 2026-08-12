INSERT INTO anime (
  id, season_id, slug, title_zh, title_ja, title_en, synopsis, editorial_note,
  yuri_kind, yuri_status, status, premiere_at, episode_count, episode_duration_min,
  studio, source_material, official_url, bangumi_url, official_x_url,
  cover_url, cover_source_url, visual_theme, featured
) VALUES
  (
    'anime-yumemita', 'season-2026-summer', 'bang-dream-yumemita',
    'BanG Dream! YUME∞MITA', 'BanG Dream! ゆめ∞みた', 'BanG Dream! YUME∞MITA',
    '为实现乐队出道而突然集结的少女们各有鲜明个性，却连正常开展乐队活动都困难。她们必须在冲突与舞台之间找到继续前进的方式。',
    NULL, 'strong', 'pending', 'airing', '2026-07-02T23:00:00+09:00', 13, 24,
    'Nichicaline', '原创', 'https://anime.bang-dream.com/yumemita/',
    'https://bgm.tv/subject/583729', 'https://x.com/bang_dream_info',
    'https://lain.bgm.tv/r/400/pic/cover/l/1c/e4/583729_KxOZV.jpg',
    'https://bgm.tv/subject/583729', 'violet', 0
  ),
  (
    'anime-korekaite', 'season-2026-summer', 'kore-kaite-shine',
    '画完这个再去死', 'これ描いて死ね', 'Draw This, Then Die!',
    '住在伊豆王岛的高中生安海相因一次契机开始创作漫画。她与同伴一同面对作画、表达和把作品交到读者手中的喜悦与挫折。',
    NULL, 'adjacent', 'confirmed', 'airing', '2026-07-03T23:30:00+09:00', 12, 24,
    'Shin-Ei Animation', '漫画', 'https://www.vap.co.jp/korekaite-shine/',
    'https://bgm.tv/subject/545917', 'https://x.com/korekaite_shine',
    'https://lain.bgm.tv/r/400/pic/cover/l/8b/c0/545917_GoNvI.jpg',
    'https://bgm.tv/subject/545917', 'ink', 0
  );

INSERT OR IGNORE INTO people (id, name, name_native, primary_kind) VALUES
  ('person-bushiroad', '武士道', 'ブシロード', 'organization'),
  ('person-umezu-tomomi', '梅津朋美', '梅津 朋美', 'staff'),
  ('person-morita-hiroshi', '森田紘吏', '森田 紘吏', 'staff'),
  ('person-goto-midori', '后藤绿', '後藤 みどり', 'staff'),
  ('person-nobusawa-osamu', '信泽收', '信澤 収', 'staff'),
  ('person-mochipuyo', 'もちぷよ', 'もちぷよ', 'staff'),
  ('person-nakamachi-arale', '仲町亚来', '仲町あられ', 'cast'),
  ('person-miyanaga-nonoka', '宫永乃乃花', '宮永ののか', 'cast'),
  ('person-minetsuki-ritsu', '峰月律', '峰月律', 'cast'),
  ('person-fuji-miyako', '藤都子', '藤都子', 'cast'),
  ('person-sengoku-yuno', '千石优乃', '千石ユノ', 'cast'),
  ('person-sanai-runa', '佐内瑠奈', '佐内 瑠奈', 'cast'),
  ('person-hondo-kaede', '本渡枫', '本渡 楓', 'cast'),
  ('person-toyoda-minoru', '丰田实', 'とよ田みのる', 'author'),
  ('person-akagi-hiroaki', '赤城博昭', '赤城博昭', 'staff'),
  ('person-fukuda-yuko', '福田裕子', '福田裕子', 'staff'),
  ('person-segawa-kenju', '濑川健寿', '瀬川健寿', 'staff'),
  ('person-tsutsumi-hiroaki', '堤博明', '堤博明', 'staff'),
  ('person-sekine-akira', '关根明良', '関根明良', 'cast'),
  ('person-hayami-saori', '早见沙织', '早見沙織', 'cast'),
  ('person-hitomi-saaya', '仁见纱绫', '仁見紗綾', 'cast'),
  ('person-fujimura-kanon', '藤村花音', '藤村花音', 'cast'),
  ('person-minase-inori', '水濑祈', '水瀬いのり', 'cast');

INSERT OR IGNORE INTO characters (
  id, anime_id, name, name_native, profile, birthday_verified, sort_order
) VALUES
  ('char-yume-arale', 'anime-yumemita', '仲町亚来', '仲町あられ', '主唱。', 0, 1),
  ('char-yume-nonoka', 'anime-yumemita', '宫永乃乃花', '宮永ののか', '吉他手。', 0, 2),
  ('char-yume-ritsu', 'anime-yumemita', '峰月律', '峰月律', '吉他手。', 0, 3),
  ('char-yume-miyako', 'anime-yumemita', '藤都子', '藤都子', '键盘手。', 0, 4),
  ('char-yume-yuno', 'anime-yumemita', '千石优乃', '千石ユノ', 'DJ / Manipulator。', 0, 5),
  ('char-yume-manager', 'anime-yumemita', '经纪人', 'マネージャー', '乐队的经纪人兼制作人。', 0, 6),
  ('char-yume-viola', 'anime-yumemita', 'Viola', 'ビオラ', NULL, 0, 7),
  ('char-draw-ai', 'anime-korekaite', '安海相', '安海 相', '喜爱漫画、开始尝试创作的高中生。', 0, 1),
  ('char-draw-rei', 'anime-korekaite', '手岛零', '手島 零', NULL, 0, 2),
  ('char-draw-kokoro', 'anime-korekaite', '藤森心', '藤森 心', NULL, 0, 3),
  ('char-draw-sachi', 'anime-korekaite', '赤福幸', '赤福 幸', NULL, 0, 4),
  ('char-draw-hikaru', 'anime-korekaite', '石龙光', '石龍 光', NULL, 0, 5);

INSERT OR IGNORE INTO work_credits (id, anime_id, person_id, role, sort_order) VALUES
  ('credit-yume-1', 'anime-yumemita', 'person-bushiroad', '原作', 1),
  ('credit-yume-2', 'anime-yumemita', 'person-umezu-tomomi', '监督', 2),
  ('credit-yume-3', 'anime-yumemita', 'person-morita-hiroshi', '副监督', 3),
  ('credit-yume-4', 'anime-yumemita', 'person-goto-midori', '系列构成', 4),
  ('credit-yume-5', 'anime-yumemita', 'person-nobusawa-osamu', '角色设计', 5),
  ('credit-yume-6', 'anime-yumemita', 'person-mochipuyo', '角色设计', 6),
  ('credit-draw-1', 'anime-korekaite', 'person-toyoda-minoru', '原作', 1),
  ('credit-draw-2', 'anime-korekaite', 'person-akagi-hiroaki', '监督', 2),
  ('credit-draw-3', 'anime-korekaite', 'person-fukuda-yuko', '系列构成', 3),
  ('credit-draw-4', 'anime-korekaite', 'person-segawa-kenju', '角色设计', 4),
  ('credit-draw-5', 'anime-korekaite', 'person-tsutsumi-hiroaki', '音乐', 5);

INSERT OR IGNORE INTO cast_credits (id, anime_id, character_id, person_id, sort_order) VALUES
  ('cast-yume-1', 'anime-yumemita', 'char-yume-arale', 'person-nakamachi-arale', 1),
  ('cast-yume-2', 'anime-yumemita', 'char-yume-nonoka', 'person-miyanaga-nonoka', 2),
  ('cast-yume-3', 'anime-yumemita', 'char-yume-ritsu', 'person-minetsuki-ritsu', 3),
  ('cast-yume-4', 'anime-yumemita', 'char-yume-miyako', 'person-fuji-miyako', 4),
  ('cast-yume-5', 'anime-yumemita', 'char-yume-yuno', 'person-sengoku-yuno', 5),
  ('cast-yume-6', 'anime-yumemita', 'char-yume-manager', 'person-sanai-runa', 6),
  ('cast-yume-7', 'anime-yumemita', 'char-yume-viola', 'person-hondo-kaede', 7),
  ('cast-draw-1', 'anime-korekaite', 'char-draw-ai', 'person-sekine-akira', 1),
  ('cast-draw-2', 'anime-korekaite', 'char-draw-rei', 'person-hayami-saori', 2),
  ('cast-draw-3', 'anime-korekaite', 'char-draw-kokoro', 'person-hitomi-saaya', 3),
  ('cast-draw-4', 'anime-korekaite', 'char-draw-sachi', 'person-fujimura-kanon', 4),
  ('cast-draw-5', 'anime-korekaite', 'char-draw-hikaru', 'person-minase-inori', 5);

INSERT OR IGNORE INTO accounts (id, owner_type, owner_id, platform, handle, url, verified, monitor_mode) VALUES
  ('account-yume-x', 'anime', 'anime-yumemita', 'X', '@bang_dream_info', 'https://x.com/bang_dream_info', 1, 'local'),
  ('account-draw-x', 'anime', 'anime-korekaite', 'X', '@korekaite_shine', 'https://x.com/korekaite_shine', 1, 'local');

INSERT INTO broadcast_slots (id, anime_id, label, weekday, local_time, timezone, platform_url, is_primary) VALUES
  ('slot-yume', 'anime-yumemita', 'TOKYO MX', 4, '23:00', 'Asia/Tokyo', 'https://anime.bang-dream.com/yumemita/news/post-2', 1),
  ('slot-draw', 'anime-korekaite', '日本电视台系', 5, '23:30', 'Asia/Tokyo', 'https://www.vap.co.jp/korekaite-shine/#onair', 1);

INSERT INTO events (id, anime_id, event_type, title, starts_at, timezone, source_url, verified) VALUES
  ('event-yume-premiere', 'anime-yumemita', 'broadcast', '第 1—3 话首播', '2026-07-02T23:00:00+09:00', 'Asia/Tokyo', 'https://anime.bang-dream.com/yumemita/news/post-2', 1),
  ('event-draw-premiere', 'anime-korekaite', 'broadcast', '第 1 话首播', '2026-07-03T23:30:00+09:00', 'Asia/Tokyo', 'https://www.vap.co.jp/korekaite-shine/', 1);

INSERT OR IGNORE INTO research_sources (
  id, anime_id, account_id, source_type, label, url, trust_level,
  poll_interval_min, cadence_profile, next_check_at
) VALUES
  ('source-yume-news', 'anime-yumemita', NULL, 'official_page', '动画公式 NEWS', 'https://anime.bang-dream.com/yumemita/news/', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-yume-bgm', 'anime-yumemita', NULL, 'bangumi', 'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/583729', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-draw-news', 'anime-korekaite', NULL, 'official_page', '动画公式 NEWS', 'https://www.vap.co.jp/korekaite-shine/news/', 'official', 720, 'local', CURRENT_TIMESTAMP),
  ('source-draw-bgm', 'anime-korekaite', NULL, 'bangumi', 'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/545917', 'community', 1440, 'local', CURRENT_TIMESTAMP);
