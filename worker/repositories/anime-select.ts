export const ANIME_SELECT = `
  SELECT a.id, a.slug, a.title_zh, a.title_zh_source_url, a.title_ja, a.title_en, a.synopsis,
    a.editorial_note, a.yuri_kind, a.yuri_status, a.status, a.premiere_at, a.episode_count,
    a.episode_duration_min, a.premiere_episode_count, a.latest_verified_episode,
    a.latest_episode_source_url, a.latest_episode_checked_at,
    a.studio, a.source_material, a.official_url,
    a.bangumi_url, a.official_x_url, a.cover_url, a.cover_source_url,
    a.main_character_source_url, a.main_character_expected_count, a.main_character_checked_at,
    a.visual_theme, a.featured,
    bs.id AS slot_id, bs.label AS slot_label, bs.weekday AS slot_weekday,
    bs.local_time AS slot_local_time, bs.timezone AS slot_timezone,
    bs.platform_url AS slot_platform_url,
    MAX(CASE WHEN fi.withdrawn_at IS NULL THEN fi.published_at END) AS latest_feed_at,
    COUNT(DISTINCT CASE WHEN fi.withdrawn_at IS NULL THEN fi.id END) AS feed_count
  FROM anime a
  LEFT JOIN broadcast_slots bs ON bs.anime_id = a.id AND bs.is_primary = 1
  LEFT JOIN feed_items fi ON fi.anime_id = a.id
`;
