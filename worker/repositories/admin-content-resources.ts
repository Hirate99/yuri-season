import type { AdminDiscussion, AdminEvent, AdminMedia, AdminThemeSong } from "@/domain";

export async function readAdminContentResources(db: D1Database, animeId: string): Promise<{
  events: AdminEvent[];
  media: AdminMedia[];
  discussions: AdminDiscussion[];
  themeSongs: AdminThemeSong[];
}> {
  const [events, media, discussions, themeSongs] = await Promise.all([
    db.prepare(`
      SELECT id, person_id, character_id, event_type, title, starts_at, ends_at,
        timezone, recurrence_rule, source_url, verified, status
      FROM events WHERE anime_id = ? AND event_type != 'birthday'
      ORDER BY COALESCE(starts_at, '9999-12-31'), title, id
    `).bind(animeId).all<{
      id: string; person_id: string | null; character_id: string | null;
      event_type: AdminEvent["eventType"]; title: string; starts_at: string | null;
      ends_at: string | null; timezone: string; recurrence_rule: string | null;
      source_url: string | null; verified: number; status: AdminEvent["status"];
    }>(),
    db.prepare(`
      SELECT id, person_id, character_id, content_class, title, creator_name,
        creator_url, original_url, preview_url, presentation_mode, safety_rating,
        spoiler_level, rights_note, published_at
      FROM media_items WHERE anime_id = ? ORDER BY published_at DESC, id
    `).bind(animeId).all<{
      id: string; person_id: string | null; character_id: string | null;
      content_class: AdminMedia["contentClass"]; title: string; creator_name: string;
      creator_url: string | null; original_url: string; preview_url: string | null;
      presentation_mode: AdminMedia["presentationMode"]; safety_rating: AdminMedia["safetyRating"];
      spoiler_level: AdminMedia["spoilerLevel"]; rights_note: string | null; published_at: string;
    }>(),
    db.prepare(`
      SELECT d.id, d.platform, d.title, d.url, d.note, d.is_active,
        d.last_activity_at, d.last_checked_at,
        (SELECT COUNT(*) FROM discussion_anime linked WHERE linked.discussion_id = d.id) AS shared_anime_count,
        (SELECT GROUP_CONCAT(linked.anime_id, ',') FROM discussion_anime linked
          WHERE linked.discussion_id = d.id) AS anime_ids
      FROM discussions d
      JOIN discussion_anime da ON da.discussion_id = d.id
      WHERE da.anime_id = ?
      ORDER BY d.is_active DESC, COALESCE(d.last_activity_at, d.last_checked_at) DESC, d.id
    `).bind(animeId).all<{
      id: string; platform: string; title: string; url: string; note: string | null;
      is_active: number; last_activity_at: string | null; last_checked_at: string | null;
      shared_anime_count: number; anime_ids: string | null;
    }>(),
    db.prepare(`
      SELECT ats.id, ats.track_id, ats.song_kind, ats.sequence, mt.title, mt.artist,
        mt.lyricist, mt.composer, mt.arranger, ats.episode_range, mt.official_url,
        mt.cover_url, mt.cover_source_url, mt.source_url, mt.verified, ats.sort_order,
        (SELECT COUNT(*) FROM anime_theme_songs linked WHERE linked.track_id = mt.id) AS shared_anime_count
      FROM anime_theme_songs ats
      JOIN music_tracks mt ON mt.id = ats.track_id
      WHERE ats.anime_id = ?
      ORDER BY ats.sort_order, ats.song_kind, ats.sequence, ats.id
    `).bind(animeId).all<{
      id: string; track_id: string; song_kind: AdminThemeSong["songKind"]; sequence: number;
      title: string; artist: string; lyricist: string | null; composer: string | null;
      arranger: string | null; episode_range: string | null; official_url: string | null;
      cover_url: string | null; cover_source_url: string | null; source_url: string | null;
      verified: number; sort_order: number; shared_anime_count: number;
    }>(),
  ]);
  return {
    events: events.results.map((row) => ({
      id: row.id,
      personId: row.person_id,
      characterId: row.character_id,
      eventType: row.event_type,
      title: row.title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timezone: row.timezone,
      recurrenceRule: row.recurrence_rule,
      sourceUrl: row.source_url,
      verified: row.verified === 1,
      status: row.status,
    })),
    media: media.results.map((row) => ({
      id: row.id,
      personId: row.person_id,
      characterId: row.character_id,
      contentClass: row.content_class,
      title: row.title,
      creatorName: row.creator_name,
      creatorUrl: row.creator_url,
      originalUrl: row.original_url,
      previewUrl: row.preview_url,
      presentationMode: row.presentation_mode,
      safetyRating: row.safety_rating,
      spoilerLevel: row.spoiler_level,
      rightsNote: row.rights_note,
      publishedAt: row.published_at,
    })),
    discussions: discussions.results.map((row) => ({
      id: row.id,
      platform: row.platform,
      title: row.title,
      url: row.url,
      note: row.note,
      isActive: row.is_active === 1,
      lastActivityAt: row.last_activity_at,
      lastCheckedAt: row.last_checked_at,
      sharedAnimeCount: row.shared_anime_count,
      animeIds: row.anime_ids?.split(",").filter(Boolean) ?? [],
    })),
    themeSongs: themeSongs.results.map((row) => ({
      id: row.id,
      trackId: row.track_id,
      songKind: row.song_kind,
      sequence: row.sequence,
      title: row.title,
      artist: row.artist,
      lyricist: row.lyricist,
      composer: row.composer,
      arranger: row.arranger,
      episodeRange: row.episode_range,
      officialUrl: row.official_url,
      coverUrl: row.cover_url,
      coverSourceUrl: row.cover_source_url,
      sourceUrl: row.source_url,
      verified: row.verified === 1,
      sortOrder: row.sort_order,
      sharedAnimeCount: row.shared_anime_count,
    })),
  };
}
