ALTER TABLE feed_items
  ADD COLUMN discussion_id TEXT REFERENCES discussions(id) ON DELETE SET NULL;

UPDATE feed_items
SET discussion_id = (
  SELECT d.id FROM discussions d WHERE d.url = feed_items.url
)
WHERE content_class = 'community_thread'
  AND discussion_id IS NULL;

-- Reconcile legacy rows created before publication lifecycle was separated from
-- candidate review state. A non-published candidate must not retain an active
-- public projection after this migration.
INSERT OR IGNORE INTO corrections (
  id, feed_item_id, correction_type, reason, replacement_feed_item_id, actor_type
)
SELECT
  'correction-reconcile-' || fi.id,
  fi.id,
  'withdraw',
  '迁移修复：候选已不再处于发布状态。',
  NULL,
  'system'
FROM feed_items fi
JOIN feed_candidates fc ON fc.id = fi.candidate_id
WHERE fc.status != 'published'
  AND fi.withdrawn_at IS NULL;

UPDATE feed_items
SET withdrawn_at = CURRENT_TIMESTAMP
WHERE withdrawn_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM feed_candidates fc
    WHERE fc.id = feed_items.candidate_id
      AND fc.status != 'published'
  );

CREATE INDEX idx_feed_items_discussion
  ON feed_items(discussion_id, withdrawn_at);
