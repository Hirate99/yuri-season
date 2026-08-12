UPDATE anime
SET yuri_status = 'pending'
WHERE id = 'anime-grow-up-show';

UPDATE anime
SET editorial_note = NULL
WHERE season_id = 'season-2026-summer';

UPDATE discussions
SET last_activity_at = NULL
WHERE id IN (
  'discussion-kimi-bgm',
  'discussion-kimi-sub',
  'discussion-tai-bgm',
  'discussion-kimi-yamibo',
  'discussion-kimi-bgm-group',
  'discussion-tai-yamibo',
  'discussion-nanoha-yamibo',
  'discussion-nanoha-bgm-group'
);
