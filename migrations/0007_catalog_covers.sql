ALTER TABLE anime ADD COLUMN cover_url TEXT;
ALTER TABLE anime ADD COLUMN cover_source_url TEXT;

UPDATE anime SET
  cover_url = 'https://lain.bgm.tv/r/400/pic/cover/l/b3/26/541285_CYBZc.jpg',
  cover_source_url = 'https://bgm.tv/subject/541285'
WHERE id = 'anime-kimishinu';

UPDATE anime SET
  cover_url = 'https://lain.bgm.tv/r/400/pic/cover/l/a1/d3/325767_u3pvR.jpg',
  cover_source_url = 'https://bgm.tv/subject/325767'
WHERE id = 'anime-taiari';

UPDATE anime SET
  cover_url = 'https://lain.bgm.tv/r/400/pic/cover/l/cf/0b/530729_82Fm9.jpg',
  cover_source_url = 'https://bgm.tv/subject/530729',
  bangumi_url = 'https://bgm.tv/subject/530729'
WHERE id = 'anime-nanoha-exceeds';

UPDATE anime SET
  cover_url = 'https://lain.bgm.tv/r/400/pic/cover/l/61/12/454083_DtM3t.jpg',
  cover_source_url = 'https://bgm.tv/subject/454083',
  bangumi_url = 'https://bgm.tv/subject/454083'
WHERE id = 'anime-azurlane-bisoku-2';

UPDATE feed_items SET withdrawn_at = CURRENT_TIMESTAMP
WHERE withdrawn_at IS NULL AND (
  id = 'feed-editorial-local-first'
  OR content_class = 'editorial'
  OR title = 'Bangumi 条目元数据变化待核对'
);

UPDATE feed_candidates SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP
WHERE content_class = 'editorial' OR title = 'Bangumi 条目元数据变化待核对';

INSERT INTO research_sources (
  id, anime_id, source_type, label, url, trust_level,
  poll_interval_min, cadence_profile, next_check_at
) VALUES
  ('source-nanoha-bgm', 'anime-nanoha-exceeds', 'bangumi', 'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/530729', 'community', 720, 'local', CURRENT_TIMESTAMP),
  ('source-azur-bgm', 'anime-azurlane-bisoku-2', 'bangumi', 'Bangumi 条目', 'https://api.bgm.tv/v0/subjects/454083', 'community', 720, 'local', CURRENT_TIMESTAMP);
