-- Chinese display names are aligned one-to-one with their Moegirl character pages.
-- Profile, portrait and birthday claims remain sourced to first-party BanG Dream! pages.
UPDATE characters SET
  name = CASE id
    WHEN 'char-yume-arale' THEN '仲町阿拉蕾'
    WHEN 'char-yume-nonoka' THEN '宫永野乃花'
    WHEN 'char-yume-ritsu' THEN '峰月律'
    WHEN 'char-yume-miyako' THEN '藤都子'
    WHEN 'char-yume-yuno' THEN '千石由乃'
    ELSE name
  END,
  name_source_url = CASE id
    WHEN 'char-yume-arale' THEN 'https://zh.moegirl.org.cn/%E4%BB%B2%E7%94%BA%E9%98%BF%E6%8B%89%E8%95%BE'
    WHEN 'char-yume-nonoka' THEN 'https://zh.moegirl.org.cn/%E5%AE%AB%E6%B0%B8%E9%87%8E%E4%B9%83%E8%8A%B1'
    WHEN 'char-yume-ritsu' THEN 'https://zh.moegirl.org.cn/%E5%B3%B0%E6%9C%88%E5%BE%8B'
    WHEN 'char-yume-miyako' THEN 'https://zh.moegirl.org.cn/%E8%97%A4%E9%83%BD%E5%AD%90'
    WHEN 'char-yume-yuno' THEN 'https://zh.moegirl.org.cn/%E5%8D%83%E7%9F%B3%E7%94%B1%E4%B9%83'
    ELSE name_source_url
  END,
  profile_source_url = CASE id
    WHEN 'char-yume-arale' THEN 'https://anime.bang-dream.com/yumemita/character/arale/'
    WHEN 'char-yume-nonoka' THEN 'https://anime.bang-dream.com/yumemita/character/nonoka/'
    WHEN 'char-yume-ritsu' THEN 'https://anime.bang-dream.com/yumemita/character/ritsu/'
    WHEN 'char-yume-miyako' THEN 'https://anime.bang-dream.com/yumemita/character/miyako/'
    WHEN 'char-yume-yuno' THEN 'https://anime.bang-dream.com/yumemita/character/yuno/'
    ELSE profile_source_url
  END,
  portrait_url = CASE id
    WHEN 'char-yume-arale' THEN 'https://anime.bang-dream.com/yumemita/wordpress/wp-content/themes/yumemita_v2/assets/images/character/img_character-thumb-arare.webp'
    WHEN 'char-yume-nonoka' THEN 'https://anime.bang-dream.com/yumemita/wordpress/wp-content/themes/yumemita_v2/assets/images/character/img_character-thumb-nonoka.webp'
    WHEN 'char-yume-ritsu' THEN 'https://anime.bang-dream.com/yumemita/wordpress/wp-content/themes/yumemita_v2/assets/images/character/img_character-thumb-ritsu.webp'
    WHEN 'char-yume-miyako' THEN 'https://anime.bang-dream.com/yumemita/wordpress/wp-content/themes/yumemita_v2/assets/images/character/img_character-thumb-miyako.webp'
    WHEN 'char-yume-yuno' THEN 'https://anime.bang-dream.com/yumemita/wordpress/wp-content/themes/yumemita_v2/assets/images/character/img_character-thumb-yuno.webp'
    ELSE portrait_url
  END,
  portrait_source_url = CASE id
    WHEN 'char-yume-arale' THEN 'https://anime.bang-dream.com/yumemita/character/arale/'
    WHEN 'char-yume-nonoka' THEN 'https://anime.bang-dream.com/yumemita/character/nonoka/'
    WHEN 'char-yume-ritsu' THEN 'https://anime.bang-dream.com/yumemita/character/ritsu/'
    WHEN 'char-yume-miyako' THEN 'https://anime.bang-dream.com/yumemita/character/miyako/'
    WHEN 'char-yume-yuno' THEN 'https://anime.bang-dream.com/yumemita/character/yuno/'
    ELSE portrait_source_url
  END,
  birthday_month = CASE id
    WHEN 'char-yume-arale' THEN 8 WHEN 'char-yume-nonoka' THEN 4
    WHEN 'char-yume-ritsu' THEN 2 WHEN 'char-yume-miyako' THEN 9
    WHEN 'char-yume-yuno' THEN 11 ELSE birthday_month
  END,
  birthday_day = CASE id
    WHEN 'char-yume-arale' THEN 16 WHEN 'char-yume-nonoka' THEN 17
    WHEN 'char-yume-ritsu' THEN 7 WHEN 'char-yume-miyako' THEN 19
    WHEN 'char-yume-yuno' THEN 4 ELSE birthday_day
  END,
  birthday_timezone = 'Asia/Tokyo',
  birthday_source_url = CASE id
    WHEN 'char-yume-arale' THEN 'https://bang-dream-on.bushimo.jp/character/yumemita/nakamachi-arale/'
    WHEN 'char-yume-nonoka' THEN 'https://bang-dream-on.bushimo.jp/character/yumemita/miyanaga-nonoka/'
    WHEN 'char-yume-ritsu' THEN 'https://bang-dream-on.bushimo.jp/character/yumemita/minetsuki-ritsu/'
    WHEN 'char-yume-miyako' THEN 'https://bang-dream-on.bushimo.jp/character/yumemita/fuji-miyako/'
    WHEN 'char-yume-yuno' THEN 'https://bang-dream-on.bushimo.jp/character/yumemita/sengoku-yuno/'
    ELSE birthday_source_url
  END,
  birthday_verified = 1
WHERE id IN (
  'char-yume-arale', 'char-yume-nonoka', 'char-yume-ritsu',
  'char-yume-miyako', 'char-yume-yuno'
);

UPDATE people SET name = CASE id
  WHEN 'person-nakamachi-arale' THEN '仲町阿拉蕾'
  WHEN 'person-miyanaga-nonoka' THEN '宫永野乃花'
  WHEN 'person-sengoku-yuno' THEN '千石由乃'
  ELSE name
END, updated_at = CURRENT_TIMESTAMP
WHERE id IN ('person-nakamachi-arale', 'person-miyanaga-nonoka', 'person-sengoku-yuno');

INSERT OR REPLACE INTO events (
  id, anime_id, character_id, event_type, title, starts_at, timezone,
  recurrence_rule, source_url, verified
) VALUES
  ('birthday-yume-arale', 'anime-yumemita', 'char-yume-arale', 'birthday', '仲町阿拉蕾生日',
   '2026-08-16T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY',
   'https://bang-dream-on.bushimo.jp/character/yumemita/nakamachi-arale/', 1),
  ('birthday-yume-nonoka', 'anime-yumemita', 'char-yume-nonoka', 'birthday', '宫永野乃花生日',
   '2027-04-17T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY',
   'https://bang-dream-on.bushimo.jp/character/yumemita/miyanaga-nonoka/', 1),
  ('birthday-yume-ritsu', 'anime-yumemita', 'char-yume-ritsu', 'birthday', '峰月律生日',
   '2027-02-07T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY',
   'https://bang-dream-on.bushimo.jp/character/yumemita/minetsuki-ritsu/', 1),
  ('birthday-yume-miyako', 'anime-yumemita', 'char-yume-miyako', 'birthday', '藤都子生日',
   '2026-09-19T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY',
   'https://bang-dream-on.bushimo.jp/character/yumemita/fuji-miyako/', 1),
  ('birthday-yume-yuno', 'anime-yumemita', 'char-yume-yuno', 'birthday', '千石由乃生日',
   '2026-11-04T00:00:00+09:00', 'Asia/Tokyo', 'FREQ=YEARLY',
   'https://bang-dream-on.bushimo.jp/character/yumemita/sengoku-yuno/', 1);

UPDATE anime SET main_character_checked_at = '2026-08-12T02:00:00Z'
WHERE id = 'anime-yumemita';

INSERT INTO audit_log (id, actor_type, action, entity_type, entity_id, detail_json)
VALUES (
  'audit-20260812-yumemita-birthdays', 'system', 'catalog.main-cast.birthday-verified',
  'anime', 'anime-yumemita',
  '{"mainCharacters":5,"verifiedBirthdays":5,"officialProfile":"BanG Dream! Our Notes","translationPolicy":"one_to_one_moegirl"}'
);
