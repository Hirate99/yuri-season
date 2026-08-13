import type { AdminAnimeCoverage } from "@/domain";
import { PUBLIC_DISCUSSION_PREDICATE, PUBLIC_MEDIA_PREDICATE } from "../db/queries/public-visibility";

type CoverageRow = {
  anime_id: string;
  anime_title: string;
  season_id: string;
  has_cover: number;
  broadcast_count: number;
  staff_count: number;
  cast_count: number;
  main_character_count: number;
  main_character_expected: number | null;
  sourced_main_character_count: number;
  named_main_character_count: number;
  audited_main_birthday_count: number;
  verified_main_birthday_count: number;
  verified_account_count: number;
  source_count: number;
  verified_event_count: number;
  media_count: number;
  discussion_count: number;
  theme_song_count: number;
  theme_song_cover_count: number;
};

export async function readAdminCoverage(db: D1Database): Promise<AdminAnimeCoverage[]> {
  const { results } = await db.prepare(`
    SELECT a.id AS anime_id, a.title_zh AS anime_title, a.season_id,
      CASE WHEN a.cover_url IS NOT NULL THEN 1 ELSE 0 END AS has_cover,
      (SELECT COUNT(*) FROM broadcast_slots bs WHERE bs.anime_id = a.id) AS broadcast_count,
      (SELECT COUNT(*) FROM work_credits wc WHERE wc.anime_id = a.id) AS staff_count,
      (SELECT COUNT(*) FROM cast_credits cc WHERE cc.anime_id = a.id) AS cast_count,
      (SELECT COUNT(*) FROM characters c WHERE c.anime_id = a.id AND c.is_main_group = 1) AS main_character_count,
      a.main_character_expected_count AS main_character_expected,
      (SELECT COUNT(*) FROM characters c WHERE c.anime_id = a.id AND c.is_main_group = 1
        AND c.profile_source_url IS NOT NULL) AS sourced_main_character_count,
      (SELECT COUNT(*) FROM characters c WHERE c.anime_id = a.id AND c.is_main_group = 1
        AND c.name_source_url IS NOT NULL) AS named_main_character_count,
      (SELECT COUNT(DISTINCT c.id) FROM characters c
        INNER JOIN search_memory sm ON sm.scope_type = 'character' AND sm.scope_id = c.id
          AND sm.search_kind = 'birthday' AND sm.last_searched_at IS NOT NULL
        WHERE c.anime_id = a.id AND c.is_main_group = 1) AS audited_main_birthday_count,
      (SELECT COUNT(*) FROM characters c WHERE c.anime_id = a.id AND c.is_main_group = 1
        AND c.birthday_verified = 1 AND c.birthday_month IS NOT NULL
        AND c.birthday_day IS NOT NULL AND c.birthday_source_url IS NOT NULL) AS verified_main_birthday_count,
      (SELECT COUNT(DISTINCT ac.id) FROM accounts ac WHERE ac.verified = 1 AND (
        (ac.owner_type = 'anime' AND ac.owner_id = a.id) OR
        (ac.owner_type = 'person' AND ac.owner_id IN (
          SELECT person_id FROM work_credits WHERE anime_id = a.id
          UNION SELECT person_id FROM cast_credits WHERE anime_id = a.id
        ))
      )) AS verified_account_count,
      (SELECT COUNT(*) FROM research_sources rs WHERE rs.anime_id = a.id AND rs.enabled = 1) AS source_count,
      (SELECT COUNT(*) FROM events e WHERE e.anime_id = a.id AND e.verified = 1) AS verified_event_count,
      (SELECT COUNT(*) FROM media_items m
        WHERE m.anime_id = a.id AND (${PUBLIC_MEDIA_PREDICATE})) AS media_count,
      (SELECT COUNT(*) FROM discussion_anime da JOIN discussions d ON d.id = da.discussion_id
        WHERE da.anime_id = a.id AND d.is_active = 1
          AND (${PUBLIC_DISCUSSION_PREDICATE})) AS discussion_count,
      (SELECT COUNT(*) FROM anime_theme_songs ats JOIN music_tracks mt ON mt.id = ats.track_id
        WHERE ats.anime_id = a.id AND mt.verified = 1) AS theme_song_count,
      (SELECT COUNT(*) FROM anime_theme_songs ats JOIN music_tracks mt ON mt.id = ats.track_id
        WHERE ats.anime_id = a.id AND mt.verified = 1
          AND mt.cover_url IS NOT NULL AND mt.cover_source_url IS NOT NULL) AS theme_song_cover_count
    FROM anime a
    ORDER BY a.season_id DESC, a.title_zh, a.id
  `).all<CoverageRow>();

  return results.map((row) => ({
    animeId: row.anime_id,
    animeTitle: row.anime_title,
    seasonId: row.season_id,
    hasCover: row.has_cover === 1,
    broadcasts: row.broadcast_count,
    staff: row.staff_count,
    cast: row.cast_count,
    mainCharacters: row.main_character_count,
    mainCharacterExpected: row.main_character_expected,
    sourcedMainCharacters: row.sourced_main_character_count,
    namedMainCharacters: row.named_main_character_count,
    auditedMainBirthdays: row.audited_main_birthday_count,
    verifiedMainBirthdays: row.verified_main_birthday_count,
    verifiedAccounts: row.verified_account_count,
    sources: row.source_count,
    verifiedEvents: row.verified_event_count,
    media: row.media_count,
    discussions: row.discussion_count,
    themeSongs: row.theme_song_count,
    themeSongCovers: row.theme_song_cover_count,
  }));
}
