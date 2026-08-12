INSERT OR IGNORE INTO people (id, name, name_native, primary_kind) VALUES
  ('person-enomoto-nao', '榎本直央', '榎本直央', 'staff'),
  ('person-hashimoto-yukari', '桥本由香利', '橋本由香利', 'staff'),
  ('person-michiru', '未知瑠', '未知瑠', 'staff'),
  ('person-aketagawa-jin', '明田川仁', '明田川仁', 'staff'),
  ('person-uchiyama-yumi', '内山夕实', '内山夕実', 'cast'),
  ('person-kayano-ai', '茅野爱衣', '茅野愛衣', 'cast'),
  ('person-sugiyama-riho', '杉山里穗', '杉山里穂', 'cast'),
  ('person-matsumoto-mayuko', '松本麻友子', '松本麻友子', 'staff'),
  ('person-hashiguchi-kana', '桥口佳奈', '橋口佳奈', 'staff'),
  ('person-naganawa-maria', '长绳麻理亚', '長縄まりあ', 'cast'),
  ('person-hanamori-yumiri', '花守由美里', '花守ゆみり', 'cast'),
  ('person-sato-hiromu', '佐藤博晖', '佐藤博暉', 'staff'),
  ('person-tachibana-azusa', '橘杏咲', '橘 杏咲', 'cast'),
  ('person-yuikawa-asaki', '结川麻希', '結川あさき', 'cast'),
  ('person-tamura-yukari', '田村由香里', '田村ゆかり', 'cast'),
  ('person-mizuki-nana', '水树奈奈', '水樹奈々', 'cast'),
  ('person-ueda-kana', '植田佳奈', '植田佳奈', 'cast'),
  ('person-yukana', 'ゆかな', 'ゆかな', 'cast'),
  ('person-kawahara-yoshihisa', '川原庆久', '川原慶久', 'cast'),
  ('person-hori', 'ホリ', 'ホリ', 'author'),
  ('person-maki-shunji', '牧俊治', '牧 俊治', 'staff'),
  ('person-sato-yu', '佐藤裕', '佐藤 裕', 'staff'),
  ('person-asafuji-hotaru', '浅藤萤', '浅藤 蛍', 'staff'),
  ('person-mori-nana', '森七奈', '森 七奈', 'staff'),
  ('person-yamane-nozomi', '山根希美', '山根希美', 'cast'),
  ('person-taichi-you', '大地叶', '大地 葉', 'cast'),
  ('person-abe-rika', '阿部里果', '阿部里果', 'cast');

INSERT OR IGNORE INTO characters (id, anime_id, name, name_native, profile, birthday_verified, sort_order) VALUES
  ('char-fran', 'anime-kimishinu', '芙兰', 'フラン', '学校的保健医，擅长修复魔法。', 0, 5),
  ('char-omi', 'anime-kimishinu', '奥米', 'オミ', '希娜所在十四班的班主任。', 0, 6),
  ('char-haru', 'anime-kimishinu', '哈尔', 'ハル', '身体虚弱、常在保健室度过时间的同学。', 0, 7),
  ('char-arisa', 'anime-taiari', '藤宫亚里沙', '藤宮亜里沙', NULL, 0, 5),
  ('char-hana', 'anime-taiari', '一之濑花', '一ノ瀬 花', NULL, 0, 6),
  ('char-nanoha-shiina', 'anime-nanoha-exceeds', '久濑希伊娜', '久瀬シイナ', NULL, 0, 1),
  ('char-nanoha-towa', 'anime-nanoha-exceeds', '夜海永远', '夜海トワ', NULL, 0, 2),
  ('char-nanoha', 'anime-nanoha-exceeds', '高町奈叶', '高町なのは', NULL, 0, 3),
  ('char-fate', 'anime-nanoha-exceeds', '菲特·T·哈洛温', 'フェイト・T・ハラオウン', NULL, 0, 4),
  ('char-hayate', 'anime-nanoha-exceeds', '八神疾风', '八神はやて', NULL, 0, 5),
  ('char-rein', 'anime-nanoha-exceeds', '八神琳芙斯', '八神リイン', NULL, 0, 6),
  ('char-luke', 'anime-nanoha-exceeds', '卢克·安德森', 'ルーク・アンダーソン', NULL, 0, 7),
  ('char-setsuna', 'anime-nanoha-exceeds', '久濑刹那', '久瀬セツナ', NULL, 0, 8),
  ('char-javelin', 'anime-azurlane-bisoku-2', '标枪', 'ジャベリン', NULL, 0, 1),
  ('char-ayanami', 'anime-azurlane-bisoku-2', '绫波', '綾波', NULL, 0, 2),
  ('char-laffey', 'anime-azurlane-bisoku-2', '拉菲', 'ラフィー', NULL, 0, 3),
  ('char-z23', 'anime-azurlane-bisoku-2', 'Z23', 'Z23', NULL, 0, 4);

INSERT OR IGNORE INTO work_credits (id, anime_id, person_id, role, sort_order) VALUES
  ('credit-kimi-5', 'anime-kimishinu', 'person-enomoto-nao', '副监督', 5),
  ('credit-kimi-6', 'anime-kimishinu', 'person-hashimoto-yukari', '音乐', 6),
  ('credit-kimi-7', 'anime-kimishinu', 'person-michiru', '音乐', 7),
  ('credit-kimi-8', 'anime-kimishinu', 'person-aketagawa-jin', '音响监督', 8),
  ('credit-tai-4', 'anime-taiari', 'person-matsumoto-mayuko', '角色设计', 4),
  ('credit-tai-5', 'anime-taiari', 'person-hashiguchi-kana', '音乐', 5),
  ('credit-nanoha-4', 'anime-nanoha-exceeds', 'person-sato-hiromu', '副监督', 4),
  ('credit-azur-1', 'anime-azurlane-bisoku-2', 'person-hori', '漫画', 1),
  ('credit-azur-2', 'anime-azurlane-bisoku-2', 'person-maki-shunji', '监督', 2),
  ('credit-azur-3', 'anime-azurlane-bisoku-2', 'person-sato-yu', '脚本', 3),
  ('credit-azur-4', 'anime-azurlane-bisoku-2', 'person-asafuji-hotaru', '脚本', 4),
  ('credit-azur-5', 'anime-azurlane-bisoku-2', 'person-mori-nana', '角色设计 / 总作画监督', 5);

INSERT OR IGNORE INTO cast_credits (id, anime_id, character_id, person_id, sort_order) VALUES
  ('cast-kimi-5', 'anime-kimishinu', 'char-fran', 'person-uchiyama-yumi', 5),
  ('cast-kimi-6', 'anime-kimishinu', 'char-omi', 'person-kayano-ai', 6),
  ('cast-kimi-7', 'anime-kimishinu', 'char-haru', 'person-sugiyama-riho', 7),
  ('cast-tai-5', 'anime-taiari', 'char-arisa', 'person-naganawa-maria', 5),
  ('cast-tai-6', 'anime-taiari', 'char-hana', 'person-hanamori-yumiri', 6),
  ('cast-nanoha-1', 'anime-nanoha-exceeds', 'char-nanoha-shiina', 'person-tachibana-azusa', 1),
  ('cast-nanoha-2', 'anime-nanoha-exceeds', 'char-nanoha-towa', 'person-yuikawa-asaki', 2),
  ('cast-nanoha-3', 'anime-nanoha-exceeds', 'char-nanoha', 'person-tamura-yukari', 3),
  ('cast-nanoha-4', 'anime-nanoha-exceeds', 'char-fate', 'person-mizuki-nana', 4),
  ('cast-nanoha-5', 'anime-nanoha-exceeds', 'char-hayate', 'person-ueda-kana', 5),
  ('cast-nanoha-6', 'anime-nanoha-exceeds', 'char-rein', 'person-yukana', 6),
  ('cast-nanoha-7', 'anime-nanoha-exceeds', 'char-luke', 'person-kawahara-yoshihisa', 7),
  ('cast-nanoha-8', 'anime-nanoha-exceeds', 'char-setsuna', 'person-hidaka-rina', 8),
  ('cast-azur-1', 'anime-azurlane-bisoku-2', 'char-javelin', 'person-yamane-nozomi', 1),
  ('cast-azur-2', 'anime-azurlane-bisoku-2', 'char-ayanami', 'person-taichi-you', 2),
  ('cast-azur-3', 'anime-azurlane-bisoku-2', 'char-laffey', 'person-naganawa-maria', 3),
  ('cast-azur-4', 'anime-azurlane-bisoku-2', 'char-z23', 'person-abe-rika', 4);

INSERT OR IGNORE INTO accounts (id, owner_type, owner_id, platform, handle, url, verified, monitor_mode) VALUES
  ('account-yukari-x', 'person', 'person-tamura-yukari', 'X', '@YukarinStaff', 'https://x.com/YukarinStaff', 1, 'local'),
  ('account-nana-x', 'person', 'person-mizuki-nana', 'X', '@NM_NANAPARTY', 'https://x.com/NM_NANAPARTY', 1, 'local'),
  ('account-azusa-x', 'person', 'person-tachibana-azusa', 'X', '@anzusaku1012', 'https://x.com/anzusaku1012', 1, 'local');

INSERT OR IGNORE INTO discussions (id, anime_id, platform, title, url, note, last_activity_at, last_checked_at) VALUES
  ('discussion-kimi-yamibo', 'anime-kimishinu', '百合会', '2026 年 7 月动画专楼', 'https://bbs.yamibo.com/thread-572724-1-1.html', NULL, '2026-08-11T00:00:00Z', CURRENT_TIMESTAMP),
  ('discussion-kimi-bgm-group', 'anime-kimishinu', 'Bangumi', '与你相恋到生命尽头', 'https://bgm.tv/group/topic/464457', NULL, '2026-08-04T00:00:00Z', CURRENT_TIMESTAMP),
  ('discussion-tai-yamibo', 'anime-taiari', '百合会', '感谢对战。～大小姐才不玩格斗游戏～', 'https://bbs.yamibo.com/thread-573410-1-1.html', NULL, '2026-07-20T00:00:00Z', CURRENT_TIMESTAMP),
  ('discussion-nanoha-yamibo', 'anime-nanoha-exceeds', '百合会', '魔法少女奈叶 EXCEEDS 新作讨论', 'https://bbs.yamibo.com/thread-562421-1-1.html', NULL, '2026-07-12T00:00:00Z', CURRENT_TIMESTAMP),
  ('discussion-nanoha-bgm-group', 'anime-nanoha-exceeds', 'Bangumi', '魔法少女奈叶 EXCEEDS Gun Blaze Vengeance', 'https://bangumi.tv/group/topic/465576', NULL, '2026-08-04T00:00:00Z', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO research_sources (
  id, anime_id, account_id, source_type, label, url, trust_level,
  poll_interval_min, cadence_profile, next_check_at
) VALUES
  ('source-kimi-yamibo', 'anime-kimishinu', NULL, 'community', '百合会动画专楼', 'https://bbs.yamibo.com/thread-572724-1-1.html', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-kimi-bgm-group', 'anime-kimishinu', NULL, 'community', 'Bangumi 小组讨论', 'https://bgm.tv/group/topic/464457', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-tai-yamibo', 'anime-taiari', NULL, 'community', '百合会动画讨论', 'https://bbs.yamibo.com/thread-573410-1-1.html', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-nanoha-yamibo', 'anime-nanoha-exceeds', NULL, 'community', '百合会新作讨论', 'https://bbs.yamibo.com/thread-562421-1-1.html', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-nanoha-bgm-group', 'anime-nanoha-exceeds', NULL, 'community', 'Bangumi 小组讨论', 'https://bangumi.tv/group/topic/465576', 'community', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-nana-official', 'anime-nanoha-exceeds', 'account-nana-x', 'official_page', '水树奈奈公式消息', 'https://www.mizukinana.jp/', 'verified_creator', 1440, 'local', CURRENT_TIMESTAMP),
  ('source-yukari-official', 'anime-nanoha-exceeds', 'account-yukari-x', 'official_page', '田村由香里公式消息', 'https://www.tamurayukari.com/information/', 'verified_creator', 1440, 'local', CURRENT_TIMESTAMP);
