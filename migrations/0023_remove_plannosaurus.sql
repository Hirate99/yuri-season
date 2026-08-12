INSERT INTO audit_log (
  id, actor_type, action, entity_type, entity_id, detail_json
) VALUES (
  'audit-remove-plannosaurus',
  'admin',
  'remove_anime',
  'anime',
  'anime-plannosaurus',
  '{"reason":"不符合目录范围：存在男性主角"}'
);

DELETE FROM anime WHERE id = 'anime-plannosaurus';
