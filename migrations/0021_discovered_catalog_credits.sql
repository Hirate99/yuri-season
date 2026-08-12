INSERT OR IGNORE INTO people (id, name, name_native, primary_kind) VALUES
  ('person-nakamura-satsuki', '中村飒希', '中村颯希', 'author'),
  ('person-yukikana', 'ゆき哉', 'ゆき哉', 'artist'),
  ('person-yamazaki-mitsue', '山崎光惠', '山﨑みつえ', 'staff'),
  ('person-noro-sumie', '野吕纯惠', '野呂純恵', 'staff'),
  ('person-nakamura-yoshiko', '中村能子', '中村能子', 'staff'),
  ('person-kikuchi-ai', '菊池爱', '菊池愛', 'staff'),
  ('person-ishimi-manaka', '石见舞菜香', '石見舞菜香', 'cast'),
  ('person-kawaida-natsumi', '川井田夏海', '川井田夏海', 'cast'),
  ('person-iwata-sekka', '岩田雪花', '岩田雪花', 'author'),
  ('person-aoki-yu', '青木裕', '青木 裕', 'author'),
  ('person-fukushima-toshinori', '福岛利规', '福島利規', 'staff'),
  ('person-oda-hiroyasu', '小田裕康', '小田裕康', 'staff'),
  ('person-yokote-michiko', '横手美智子', '横手美智子', 'staff'),
  ('person-fujii-masahiro', '藤井昌宏', '藤井昌宏', 'staff'),
  ('person-fairouz-ai', '菲鲁兹·蓝', 'ファイルーズあい', 'cast'),
  ('person-higashinai-mariko', '东内真理子', '東内マリ子', 'cast'),
  ('person-anzai-chika', '安济知佳', '安済知佳', 'cast'),
  ('person-ishihara-kaori', '石原夏织', '石原夏織', 'cast'),
  ('person-amami-yurina', '天海由梨奈', '天海由梨奈', 'cast'),
  ('person-koshitate-tetsuhiro', '越田哲弘', 'こしたてつひろ', 'author'),
  ('person-ikehata-hiroshi', '博史池畠', '博史池畠', 'staff'),
  ('person-hyodo-kazuho', '兵头一步', '兵頭一歩', 'staff'),
  ('person-sekikawa-shigeto', '关川成人', '関川成人', 'staff'),
  ('person-iwasaki-fuminori', '岩崎文纪', '岩崎文紀', 'staff'),
  ('person-tsukagoshi-ren', '塚越廉', '塚越廉', 'staff'),
  ('person-nakayama-manaka', '中山真奈加', '中山まなか', 'cast'),
  ('person-maeda-kaori', '前田佳织里', '前田佳織里', 'cast'),
  ('person-shinohara-yu', '筱原侑', '篠原侑', 'cast'),
  ('person-itai-hiroki', '板井宽树', '板井寛樹', 'staff'),
  ('person-nagano-takahiro', '永野孝宏', '永野たかひろ', 'staff'),
  ('person-ono-kanako', '小野可奈子', '小野可奈子', 'staff'),
  ('person-conisch', 'Conisch', 'コーニッシュ', 'staff'),
  ('person-watanabe-toshiyuki', '渡边俊幸', '渡辺俊幸', 'staff'),
  ('person-sakakihara-yuki', '榊原优希', '榊原 優希', 'cast'),
  ('person-nakamura-kanna', '中村栞奈', '中村 カンナ', 'cast'),
  ('person-morinaga-chitose', '森永千才', '森永 千才', 'cast');

INSERT OR IGNORE INTO characters (
  id, anime_id, name, name_native, profile, birthday_month, birthday_day,
  birthday_source_url, birthday_verified, sort_order
) VALUES
  (
    'char-futsutsuka-reirin', 'anime-futsutsuka', '黄玲琳', '黄 玲琳',
    '黄家的雏女，拥有不轻易屈服的意志。', 3, 31,
    'https://futsutsuka.net/news/index.html?page=3', 1, 1
  ),
  (
    'char-futsutsuka-keigetsu', 'anime-futsutsuka', '朱慧月', '朱 慧月',
    '朱家的雏女，与玲琳交换身体。', 7, 5,
    'https://futsutsuka.net/news/', 1, 2
  ),
  ('char-futsutsuka-lili', 'anime-futsutsuka', '莉莉', '莉莉', NULL, NULL, NULL, NULL, 0, 3),
  ('char-futsutsuka-gabi', 'anime-futsutsuka', '朱雅媚', '朱 雅媚', NULL, NULL, NULL, NULL, 0, 4),
  ('char-futsutsuka-hoshun', 'anime-futsutsuka', '蓝芳春', '藍 芳春', NULL, NULL, NULL, NULL, 0, 5),
  ('char-magilumiere-kana', 'anime-magilumiere-2', '樱木加奈', '桜木 カナ', NULL, NULL, NULL, NULL, 0, 1),
  ('char-magilumiere-hitomi', 'anime-magilumiere-2', '越谷仁美', '越谷 仁美', NULL, NULL, NULL, NULL, 0, 2),
  ('char-magilumiere-mei', 'anime-magilumiere-2', '土刃梅', '土刃 メイ', NULL, NULL, NULL, NULL, 0, 3),
  ('char-magilumiere-lily', 'anime-magilumiere-2', '葵莉莉', '葵 リリー', NULL, NULL, NULL, NULL, 0, 4),
  ('char-magilumiere-akane', 'anime-magilumiere-2', '槙野茜', '槇野あかね', NULL, NULL, NULL, NULL, 0, 5),
  ('char-dodge-danko', 'anime-dodge-danko', '一击弹子', '一撃弾子', NULL, NULL, NULL, NULL, 0, 1),
  ('char-dodge-chinko', 'anime-dodge-danko', '小佛珍子', '小仏珍子', NULL, NULL, NULL, NULL, 0, 2),
  ('char-dodge-mochiko', 'anime-dodge-danko', '江袋米子', '江袋もち子', NULL, NULL, NULL, NULL, 0, 3),
  ('char-dodge-susan', 'anime-dodge-danko', '苏珊·卡农', 'スーザン・キャノン', NULL, NULL, NULL, NULL, 0, 4),
  ('char-dodge-hanii', 'anime-dodge-danko', '音花羽仁衣', '音花羽仁衣', NULL, NULL, NULL, NULL, 0, 5),
  ('char-planno-tetori', 'anime-plannosaurus', '北谷特托里', '北谷テトリ', NULL, NULL, NULL, NULL, 0, 1),
  ('char-planno-kanna', 'anime-plannosaurus', '中里栞奈', '中里カンナ', NULL, NULL, NULL, NULL, 0, 2),
  ('char-planno-dino', 'anime-plannosaurus', '迪诺', 'ディノ', NULL, NULL, NULL, NULL, 0, 3);

INSERT OR IGNORE INTO work_credits (id, anime_id, person_id, role, profile_url, sort_order) VALUES
  ('credit-futsutsuka-1', 'anime-futsutsuka', 'person-nakamura-satsuki', '原作', 'https://futsutsuka.net/', 1),
  ('credit-futsutsuka-2', 'anime-futsutsuka', 'person-yukikana', '角色原案', 'https://futsutsuka.net/', 2),
  ('credit-futsutsuka-3', 'anime-futsutsuka', 'person-yamazaki-mitsue', '监督', 'https://futsutsuka.net/', 3),
  ('credit-futsutsuka-4', 'anime-futsutsuka', 'person-noro-sumie', '副监督', 'https://futsutsuka.net/', 4),
  ('credit-futsutsuka-5', 'anime-futsutsuka', 'person-nakamura-yoshiko', '系列构成', 'https://futsutsuka.net/', 5),
  ('credit-futsutsuka-6', 'anime-futsutsuka', 'person-kikuchi-ai', '角色设计', 'https://futsutsuka.net/', 6),
  ('credit-magilumiere-1', 'anime-magilumiere-2', 'person-iwata-sekka', '原作', 'https://magilumiere-pr.com/', 1),
  ('credit-magilumiere-2', 'anime-magilumiere-2', 'person-aoki-yu', '原作', 'https://magilumiere-pr.com/', 2),
  ('credit-magilumiere-3', 'anime-magilumiere-2', 'person-fukushima-toshinori', '监督', 'https://magilumiere-pr.com/', 3),
  ('credit-magilumiere-4', 'anime-magilumiere-2', 'person-oda-hiroyasu', '副监督', 'https://magilumiere-pr.com/', 4),
  ('credit-magilumiere-5', 'anime-magilumiere-2', 'person-yokote-michiko', '系列构成 / 脚本', 'https://magilumiere-pr.com/', 5),
  ('credit-magilumiere-6', 'anime-magilumiere-2', 'person-fujii-masahiro', '角色设计', 'https://magilumiere-pr.com/', 6),
  ('credit-dodge-1', 'anime-dodge-danko', 'person-koshitate-tetsuhiro', '原作', 'https://dodge-danko.com/', 1),
  ('credit-dodge-2', 'anime-dodge-danko', 'person-ikehata-hiroshi', '监督', 'https://dodge-danko.com/', 2),
  ('credit-dodge-3', 'anime-dodge-danko', 'person-hyodo-kazuho', '系列构成', 'https://dodge-danko.com/', 3),
  ('credit-dodge-4', 'anime-dodge-danko', 'person-sekikawa-shigeto', '角色设计 / 总作画监督', 'https://dodge-danko.com/', 4),
  ('credit-dodge-5', 'anime-dodge-danko', 'person-iwasaki-fuminori', '音乐', 'https://dodge-danko.com/', 5),
  ('credit-dodge-6', 'anime-dodge-danko', 'person-tsukagoshi-ren', '音乐', 'https://dodge-danko.com/', 6),
  ('credit-planno-1', 'anime-plannosaurus', 'person-itai-hiroki', '监督', 'https://www.bandaispirits.co.jp/press/2026/260306.php', 1),
  ('credit-planno-2', 'anime-plannosaurus', 'person-nagano-takahiro', '系列构成', 'https://www.bandaispirits.co.jp/press/2026/260306.php', 2),
  ('credit-planno-3', 'anime-plannosaurus', 'person-ono-kanako', '角色设计 / 总作画监督', 'https://www.bandaispirits.co.jp/press/2026/260306.php', 3),
  ('credit-planno-4', 'anime-plannosaurus', 'person-conisch', '音乐', 'https://www.bandaispirits.co.jp/press/2026/260306.php', 4),
  ('credit-planno-5', 'anime-plannosaurus', 'person-watanabe-toshiyuki', '音乐', 'https://www.bandaispirits.co.jp/press/2026/260306.php', 5);

INSERT OR IGNORE INTO cast_credits (id, anime_id, character_id, person_id, sort_order) VALUES
  ('cast-futsutsuka-1', 'anime-futsutsuka', 'char-futsutsuka-reirin', 'person-ishimi-manaka', 1),
  ('cast-futsutsuka-2', 'anime-futsutsuka', 'char-futsutsuka-keigetsu', 'person-kawaida-natsumi', 2),
  ('cast-futsutsuka-3', 'anime-futsutsuka', 'char-futsutsuka-lili', 'person-hishikawa-hana', 3),
  ('cast-futsutsuka-4', 'anime-futsutsuka', 'char-futsutsuka-gabi', 'person-kayano-ai', 4),
  ('cast-futsutsuka-5', 'anime-futsutsuka', 'char-futsutsuka-hoshun', 'person-minase-inori', 5),
  ('cast-magilumiere-1', 'anime-magilumiere-2', 'char-magilumiere-kana', 'person-fairouz-ai', 1),
  ('cast-magilumiere-2', 'anime-magilumiere-2', 'char-magilumiere-hitomi', 'person-higashinai-mariko', 2),
  ('cast-magilumiere-3', 'anime-magilumiere-2', 'char-magilumiere-mei', 'person-anzai-chika', 3),
  ('cast-magilumiere-4', 'anime-magilumiere-2', 'char-magilumiere-lily', 'person-ishihara-kaori', 4),
  ('cast-magilumiere-5', 'anime-magilumiere-2', 'char-magilumiere-akane', 'person-amami-yurina', 5),
  ('cast-dodge-1', 'anime-dodge-danko', 'char-dodge-danko', 'person-nakayama-manaka', 1),
  ('cast-dodge-2', 'anime-dodge-danko', 'char-dodge-chinko', 'person-maeda-kaori', 2),
  ('cast-dodge-3', 'anime-dodge-danko', 'char-dodge-mochiko', 'person-sekine-akira', 3),
  ('cast-dodge-4', 'anime-dodge-danko', 'char-dodge-susan', 'person-taichi-you', 4),
  ('cast-dodge-5', 'anime-dodge-danko', 'char-dodge-hanii', 'person-shinohara-yu', 5),
  ('cast-planno-1', 'anime-plannosaurus', 'char-planno-tetori', 'person-sakakihara-yuki', 1),
  ('cast-planno-2', 'anime-plannosaurus', 'char-planno-kanna', 'person-nakamura-kanna', 2),
  ('cast-planno-3', 'anime-plannosaurus', 'char-planno-dino', 'person-morinaga-chitose', 3);

INSERT OR IGNORE INTO events (
  id, anime_id, character_id, event_type, title, starts_at, timezone,
  recurrence_rule, source_url, verified
) VALUES
  (
    'birthday-futsutsuka-reirin', 'anime-futsutsuka', 'char-futsutsuka-reirin',
    'birthday', '黄玲琳生日', '2027-03-31T00:00:00+09:00', 'Asia/Tokyo',
    'FREQ=YEARLY', 'https://futsutsuka.net/news/index.html?page=3', 1
  ),
  (
    'birthday-futsutsuka-keigetsu', 'anime-futsutsuka', 'char-futsutsuka-keigetsu',
    'birthday', '朱慧月生日', '2027-07-05T00:00:00+09:00', 'Asia/Tokyo',
    'FREQ=YEARLY', 'https://futsutsuka.net/news/', 1
  );
