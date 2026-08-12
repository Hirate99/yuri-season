import type { AdminResourceKind } from "@/domain";

const tableByKind: Record<AdminResourceKind, string> = {
  broadcast: "broadcast_slots",
  account: "accounts",
  staff: "work_credits",
  cast: "cast_credits",
  source: "research_sources",
  event: "events",
  media: "media_items",
  discussion: "discussions",
  theme_song: "theme_songs",
};

const animeColumnByKind: Record<AdminResourceKind, string | null> = {
  broadcast: "anime_id",
  account: null,
  staff: "anime_id",
  cast: "anime_id",
  source: "anime_id",
  event: "anime_id",
  media: "anime_id",
  discussion: "anime_id",
  theme_song: "anime_id",
};

export async function resourceAuditSnapshot(
  db: D1Database,
  animeId: string,
  kind: AdminResourceKind,
  id: string,
): Promise<Record<string, unknown> | null> {
  if (kind === "account") {
    return db.prepare(`
      SELECT id, owner_type, owner_id, platform, handle, url, verified, monitor_mode,
        verification_source_url, verified_at
      FROM accounts WHERE id = ?
    `).bind(id).first<Record<string, unknown>>();
  }
  if (kind === "discussion") {
    return db.prepare(`
      SELECT d.* FROM discussions d
      JOIN discussion_anime da ON da.discussion_id = d.id
      WHERE d.id = ? AND da.anime_id = ?
    `).bind(id, animeId).first<Record<string, unknown>>();
  }
  if (kind === "theme_song") {
    return db.prepare(`
      SELECT ats.*, mt.title, mt.artist, mt.lyricist, mt.composer, mt.arranger,
        mt.official_url, mt.cover_url, mt.cover_source_url, mt.source_url, mt.verified
      FROM anime_theme_songs ats JOIN music_tracks mt ON mt.id = ats.track_id
      WHERE ats.id = ? AND ats.anime_id = ?
    `).bind(id, animeId).first<Record<string, unknown>>();
  }
  if (kind === "cast") {
    return db.prepare(`
      SELECT cc.*, c.name, c.name_native, c.name_source_url, c.profile,
        c.profile_source_url, c.portrait_url, c.portrait_source_url, c.is_main_group,
        c.birthday_month, c.birthday_day, c.birthday_year, c.birthday_timezone,
        c.birthday_source_url, c.birthday_verified
      FROM cast_credits cc JOIN characters c ON c.id = cc.character_id
      WHERE cc.id = ? AND cc.anime_id = ?
    `).bind(id, animeId).first<Record<string, unknown>>();
  }
  const table = tableByKind[kind];
  const animeColumn = animeColumnByKind[kind];
  return db.prepare(`SELECT * FROM ${table} WHERE id = ? AND ${animeColumn} = ?`)
    .bind(id, animeId).first<Record<string, unknown>>();
}
