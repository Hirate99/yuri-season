ALTER TABLE anime ADD COLUMN title_zh_source_url TEXT;
ALTER TABLE anime ADD COLUMN main_character_source_url TEXT;
ALTER TABLE anime ADD COLUMN main_character_expected_count INTEGER;
ALTER TABLE anime ADD COLUMN main_character_checked_at TEXT;

ALTER TABLE characters ADD COLUMN name_source_url TEXT;
ALTER TABLE characters ADD COLUMN profile_source_url TEXT;
ALTER TABLE characters ADD COLUMN portrait_url TEXT;
ALTER TABLE characters ADD COLUMN portrait_source_url TEXT;
ALTER TABLE characters ADD COLUMN is_main_group INTEGER NOT NULL DEFAULT 1 CHECK (is_main_group IN (0, 1));

UPDATE characters SET
  portrait_url = CASE id
    WHEN 'char-grow-mizuka' THEN 'https://growupshow.com/assets/img/top/character2/chara01_thumb.png'
    WHEN 'char-grow-oka' THEN 'https://growupshow.com/assets/img/top/character2/chara02_thumb.png'
    WHEN 'char-grow-imari' THEN 'https://growupshow.com/assets/img/top/character2/chara03_thumb.png'
    WHEN 'char-grow-isuzu' THEN 'https://growupshow.com/assets/img/top/character2/chara04_thumb.png'
    WHEN 'char-grow-aoi' THEN 'https://growupshow.com/assets/img/top/character2/chara05_thumb.png'
    WHEN 'char-grow-akane' THEN 'https://growupshow.com/assets/img/top/character2/chara06_thumb.png'
    WHEN 'char-grow-shizuku' THEN 'https://growupshow.com/assets/img/top/character2/chara07_thumb.png'
    WHEN 'char-grow-svetlana' THEN 'https://growupshow.com/assets/img/top/character2/chara08_thumb.png'
    WHEN 'char-grow-maria' THEN 'https://growupshow.com/assets/img/top/character2/chara09_thumb.png'
    WHEN 'char-grow-rin' THEN 'https://growupshow.com/assets/img/top/character2/chara10_thumb.png'
    WHEN 'char-futsutsuka-reirin' THEN 'https://futsutsuka.net/assets/img/character/c1.png'
    WHEN 'char-futsutsuka-keigetsu' THEN 'https://futsutsuka.net/assets/img/character/c2.png'
    ELSE portrait_url
  END,
  portrait_source_url = CASE
    WHEN id LIKE 'char-grow-%' THEN 'https://growupshow.com/#character'
    WHEN id IN ('char-futsutsuka-reirin', 'char-futsutsuka-keigetsu')
      THEN 'https://futsutsuka.net/character/index.html'
    ELSE portrait_source_url
  END
WHERE id LIKE 'char-grow-%'
   OR id IN ('char-futsutsuka-reirin', 'char-futsutsuka-keigetsu');

-- “主要角色”按作品的常驻主角团维护，而不是把公式角色页整页抄入。
UPDATE anime SET
  main_character_source_url = CASE id
    WHEN 'anime-yumemita' THEN 'https://anime.bang-dream.com/yumemita/character/'
    WHEN 'anime-kimishinu' THEN 'https://kimishinu-anime.com/character/'
    WHEN 'anime-goodbye-lara' THEN 'https://goodbyelara.com/'
    WHEN 'anime-grow-up-show' THEN 'https://growupshow.com/#character'
    WHEN 'anime-futsutsuka' THEN 'https://futsutsuka.net/character/'
    WHEN 'anime-taiari' THEN 'https://taiari-anime.com/'
    WHEN 'anime-dodge-danko' THEN 'https://dodge-danko.com/'
    WHEN 'anime-korekaite' THEN 'https://www.vap.co.jp/korekaite-shine/'
    WHEN 'anime-azurlane-bisoku-2' THEN 'https://2nd.azurlane-bisoku.jp/'
    WHEN 'anime-magilumiere-2' THEN 'https://magilumiere-pr.com/character/'
    WHEN 'anime-nanoha-exceeds' THEN 'https://www.nanoha.com/EXGV/character/'
    ELSE main_character_source_url
  END,
  main_character_expected_count = CASE id
    WHEN 'anime-yumemita' THEN 5
    WHEN 'anime-kimishinu' THEN 4
    WHEN 'anime-goodbye-lara' THEN 2
    WHEN 'anime-grow-up-show' THEN 10
    WHEN 'anime-futsutsuka' THEN 2
    WHEN 'anime-taiari' THEN 6
    WHEN 'anime-dodge-danko' THEN 7
    WHEN 'anime-korekaite' THEN 5
    WHEN 'anime-azurlane-bisoku-2' THEN 4
    WHEN 'anime-magilumiere-2' THEN 5
    WHEN 'anime-nanoha-exceeds' THEN 8
    ELSE main_character_expected_count
  END,
  main_character_checked_at = '2026-08-12T00:00:00Z'
WHERE id IN (
  'anime-yumemita', 'anime-kimishinu', 'anime-goodbye-lara', 'anime-grow-up-show',
  'anime-futsutsuka', 'anime-taiari', 'anime-dodge-danko', 'anime-korekaite',
  'anime-azurlane-bisoku-2', 'anime-magilumiere-2', 'anime-nanoha-exceeds'
);

UPDATE characters SET profile_source_url = CASE anime_id
  WHEN 'anime-yumemita' THEN 'https://anime.bang-dream.com/yumemita/character/'
  WHEN 'anime-kimishinu' THEN 'https://kimishinu-anime.com/character/'
  WHEN 'anime-goodbye-lara' THEN 'https://goodbyelara.com/'
  WHEN 'anime-grow-up-show' THEN 'https://growupshow.com/#character'
  WHEN 'anime-futsutsuka' THEN 'https://futsutsuka.net/character/'
  WHEN 'anime-taiari' THEN 'https://taiari-anime.com/'
  WHEN 'anime-dodge-danko' THEN 'https://dodge-danko.com/'
  WHEN 'anime-korekaite' THEN 'https://www.vap.co.jp/korekaite-shine/'
  WHEN 'anime-azurlane-bisoku-2' THEN 'https://2nd.azurlane-bisoku.jp/'
  WHEN 'anime-magilumiere-2' THEN 'https://magilumiere-pr.com/character/'
  WHEN 'anime-nanoha-exceeds' THEN 'https://www.nanoha.com/EXGV/character/'
  ELSE profile_source_url
END
WHERE anime_id IN (
  'anime-yumemita', 'anime-kimishinu', 'anime-goodbye-lara', 'anime-grow-up-show',
  'anime-futsutsuka', 'anime-taiari', 'anime-dodge-danko', 'anime-korekaite',
  'anime-azurlane-bisoku-2', 'anime-magilumiere-2', 'anime-nanoha-exceeds'
);

-- 这些资料继续留在 Admin，但不再混入前台主角团。
UPDATE characters SET is_main_group = 0 WHERE id IN (
  'char-yume-manager', 'char-yume-viola',
  'char-fran', 'char-omi', 'char-haru',
  'char-lara-grace', 'char-lara-luca', 'char-lara-yoshiya', 'char-lara-makoto',
  'char-lara-ema', 'char-lara-rowan', 'char-lara-lisa', 'char-lara-kota',
  'char-futsutsuka-lili', 'char-futsutsuka-gabi', 'char-futsutsuka-hoshun'
);

-- 《斗球女弹子》的新玉川高校主角团缺了两人。
INSERT OR IGNORE INTO people (id, name, name_native, primary_kind) VALUES
  ('person-uesaka-sumire', '上坂堇', '上坂すみれ', 'cast');

INSERT OR IGNORE INTO characters (
  id, anime_id, name, name_native, profile_source_url, is_main_group,
  birthday_verified, sort_order
) VALUES
  ('char-dodge-hako', 'anime-dodge-danko', '三笠はこ', '三笠はこ',
   'https://dodge-danko.com/', 1, 0, 6),
  ('char-dodge-hayami', 'anime-dodge-danko', '火浦颯美', '火浦颯美',
   'https://dodge-danko.com/', 1, 0, 7);

INSERT OR IGNORE INTO cast_credits (id, anime_id, character_id, person_id, sort_order) VALUES
  ('cast-dodge-6', 'anime-dodge-danko', 'char-dodge-hako', 'person-uesaka-sumire', 6),
  ('cast-dodge-7', 'anime-dodge-danko', 'char-dodge-hayami', 'person-nakamura-kanna', 7);

-- 萌娘百科只作中文译名对照；公式资料仍是人物身份与主角团判定来源。
UPDATE anime SET title_zh_source_url =
  'https://zh.moegirl.org.cn/zh/%E4%B8%8E%E4%BD%A0%E7%9B%B8%E6%81%8B%E5%88%B0%E7%94%9F%E5%91%BD%E5%B0%BD%E5%A4%B4'
WHERE id = 'anime-kimishinu';

UPDATE characters SET
  name = CASE id
    WHEN 'char-sheena' THEN '席娜'
    WHEN 'char-mimi' THEN '美美'
    WHEN 'char-lizzy' THEN '星兰'
    WHEN 'char-ali' THEN '亚里'
    ELSE name
  END,
  name_source_url = 'https://zh.moegirl.org.cn/zh/%E4%B8%8E%E4%BD%A0%E7%9B%B8%E6%81%8B%E5%88%B0%E7%94%9F%E5%91%BD%E5%B0%BD%E5%A4%B4'
WHERE id IN ('char-sheena', 'char-mimi', 'char-lizzy', 'char-ali');

UPDATE characters SET name_source_url =
  'https://zh.moegirl.org.cn/%E8%99%BD%E7%84%B6%E6%88%91%E6%98%AF%E4%B8%8D%E5%AE%8C%E7%BE%8E%E6%81%B6%E5%A5%B3_%EF%BD%9E%E9%9B%8F%E5%AE%AB%E8%9D%B6%E9%BC%A0%E6%9B%BF%E6%8D%A2%E4%BC%A0%EF%BD%9E'
WHERE id IN ('char-futsutsuka-reirin', 'char-futsutsuka-keigetsu');

UPDATE characters SET name_source_url =
  'https://zh.moegirl.org.cn/%E6%9F%94%E5%85%89%E9%AD%94%E5%A5%B3%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8'
WHERE id IN (
  'char-magilumiere-kana', 'char-magilumiere-hitomi', 'char-magilumiere-mei',
  'char-magilumiere-lily', 'char-magilumiere-akane'
);

UPDATE characters SET name_source_url = CASE id
  WHEN 'char-nanoha' THEN 'https://zh.moegirl.org.cn/%E9%AB%98%E7%94%BA%E5%A5%88%E5%8F%B6'
  WHEN 'char-hayate' THEN 'https://zh.moegirl.org.cn/%E5%85%AB%E7%A5%9E%E7%96%BE%E9%A3%8E'
  ELSE name_source_url
END
WHERE id IN ('char-nanoha', 'char-hayate');

UPDATE people SET name = '东内麻里子', updated_at = CURRENT_TIMESTAMP
WHERE id = 'person-higashinai-mariko';

INSERT INTO audit_log (
  id, actor_type, action, entity_type, entity_id, detail_json
) VALUES (
  'audit-20260812-main-cast-baseline', 'system', 'catalog.main-cast.baseline',
  'season', 'season-2026-summer',
  '{"scope":"main_group_only","animeCount":11,"expectedMainCharacters":58,"translationPolicy":"explicit_moegirl_match_only","supportingCharactersRetained":true}'
);
