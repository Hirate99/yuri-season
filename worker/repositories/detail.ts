import type { Account, AnimeDetail, AnimeSource, CharacterCredit, PersonCredit, ThemeSong } from "@/domain";
import { mapAccount, mapAnime, mapBroadcast, mapEvent } from "../db/mappers";
import type { AccountRow, AnimeRow, BroadcastRow, CastRow, EventRow, StaffRow } from "../db/rows";
import { ANIME_SELECT } from "./anime-select";
import { EVENT_SELECT } from "./catalog";

function groupAccounts(rows: AccountRow[]): Map<string, Account[]> {
  const grouped = new Map<string, Account[]>();
  for (const row of rows) {
    const accounts = grouped.get(row.owner_id) ?? [];
    accounts.push(mapAccount(row));
    grouped.set(row.owner_id, accounts);
  }
  return grouped;
}

function timestampValue(value: string): number {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  return Date.parse(normalized);
}

export async function readAnimeDetail(db: D1Database, slug: string): Promise<AnimeDetail | null> {
  const row = await db
    .prepare(`${ANIME_SELECT} WHERE a.slug = ? GROUP BY a.id, bs.id LIMIT 1`)
    .bind(slug)
    .first<AnimeRow>();
  if (!row) return null;

  const [broadcasts, staff, cast, accounts, events, sources, themeSongs] = await Promise.all([
    db.prepare("SELECT id, label, weekday, local_time, timezone, platform_url, is_primary FROM broadcast_slots WHERE anime_id = ? ORDER BY is_primary DESC, weekday, local_time").bind(row.id).all<BroadcastRow>(),
    db.prepare(`
      SELECT wc.id, wc.person_id, wc.role, p.name, p.name_native, wc.profile_url
      FROM work_credits wc JOIN people p ON p.id = wc.person_id
      WHERE wc.anime_id = ? ORDER BY wc.sort_order, wc.id
    `).bind(row.id).all<StaffRow>(),
    db.prepare(`
      SELECT cc.id, cc.character_id, cc.person_id, c.name AS character_name,
        c.name_native AS character_name_native, c.name_source_url,
        c.profile AS character_profile, c.profile_source_url,
        c.portrait_url, c.portrait_source_url,
        p.name AS person_name, p.name_native AS person_name_native,
        c.birthday_month, c.birthday_day, c.birthday_verified
      FROM cast_credits cc
      JOIN characters c ON c.id = cc.character_id
      JOIN people p ON p.id = cc.person_id
      WHERE cc.anime_id = ? AND c.is_main_group = 1 ORDER BY cc.sort_order, cc.id
    `).bind(row.id).all<CastRow>(),
    db.prepare(`
      SELECT id, owner_id, platform, handle, url, verified FROM accounts
      WHERE (owner_type = 'anime' AND owner_id = ?)
        OR (owner_type = 'person' AND owner_id IN (
          SELECT person_id FROM work_credits WHERE anime_id = ?
          UNION SELECT person_id FROM cast_credits WHERE anime_id = ?
        ))
      ORDER BY verified DESC, platform, handle
    `).bind(row.id, row.id, row.id).all<AccountRow>(),
    db.prepare(`${EVENT_SELECT} WHERE e.anime_id = ? AND e.verified = 1 ORDER BY e.starts_at, e.title`).bind(row.id).all<EventRow>(),
    db.prepare(`
      SELECT id, label, url, trust_level, last_checked_at
      FROM research_sources
      WHERE anime_id = ? AND enabled = 1
      ORDER BY CASE trust_level
        WHEN 'official' THEN 0 WHEN 'verified_creator' THEN 1
        WHEN 'community' THEN 2 ELSE 3 END,
        label, id
    `).bind(row.id).all<{
      id: string;
      label: string;
      url: string;
      trust_level: AnimeSource["trustLevel"];
      last_checked_at: string | null;
    }>(),
    db.prepare(`
      SELECT ats.id, ats.song_kind, ats.sequence, mt.title, mt.artist, mt.lyricist,
        mt.composer, mt.arranger, ats.episode_range, mt.official_url,
        mt.cover_url, mt.cover_source_url, mt.source_url
      FROM anime_theme_songs ats
      JOIN music_tracks mt ON mt.id = ats.track_id
      WHERE ats.anime_id = ? AND mt.verified = 1 AND mt.source_url IS NOT NULL
      ORDER BY ats.sort_order, ats.song_kind, ats.sequence, ats.id
    `).bind(row.id).all<{
      id: string; song_kind: ThemeSong["songKind"]; sequence: number;
      title: string; artist: string; lyricist: string | null; composer: string | null;
      arranger: string | null; episode_range: string | null; official_url: string | null;
      cover_url: string | null; cover_source_url: string | null; source_url: string;
    }>(),
  ]);

  const accountsByOwner = groupAccounts(accounts.results);
  const staffCredits: PersonCredit[] = staff.results.map((item) => ({
    id: item.id,
    personId: item.person_id,
    role: item.role,
    name: item.name,
    nameNative: item.name_native,
    profileUrl: item.profile_url,
    accounts: accountsByOwner.get(item.person_id) ?? [],
  }));
  const castCredits: CharacterCredit[] = cast.results.map((item) => ({
    id: item.id,
    characterId: item.character_id,
    personId: item.person_id,
    characterName: item.character_name,
    characterNameNative: item.character_name_native,
    nameSourceUrl: item.name_source_url,
    characterProfile: item.character_profile,
    profileSourceUrl: item.profile_source_url,
    portraitUrl: item.portrait_url,
    portraitSourceUrl: item.portrait_source_url,
    personName: item.person_name,
    personNameNative: item.person_name_native,
    birthdayMonth: item.birthday_month,
    birthdayDay: item.birthday_day,
    birthdayVerified: item.birthday_verified === 1,
    accounts: accountsByOwner.get(item.person_id) ?? [],
  }));
  const sourceRows = [...new Map(sources.results.map((source) => [source.url, source])).values()];
  const lastCheckedAt = sourceRows.reduce<string | null>((latest, source) => {
    if (!source.last_checked_at) return latest;
    if (!latest) return source.last_checked_at;
    return timestampValue(source.last_checked_at) > timestampValue(latest) ? source.last_checked_at : latest;
  }, null);

  return {
    ...mapAnime(row),
    episodeDurationMin: row.episode_duration_min,
    sourceMaterial: row.source_material,
    broadcasts: broadcasts.results.map(mapBroadcast),
    staff: staffCredits,
    cast: castCredits,
    accounts: accountsByOwner.get(row.id) ?? [],
    events: events.results.map(mapEvent),
    themeSongs: themeSongs.results.map((song) => ({
      id: song.id,
      songKind: song.song_kind,
      sequence: song.sequence,
      title: song.title,
      artist: song.artist,
      lyricist: song.lyricist,
      composer: song.composer,
      arranger: song.arranger,
      episodeRange: song.episode_range,
      officialUrl: song.official_url,
      coverUrl: song.cover_url,
      coverSourceUrl: song.cover_source_url,
      sourceUrl: song.source_url,
    })),
    sources: sourceRows.map((source) => ({
      id: source.id,
      label: source.label,
      url: source.url,
      trustLevel: source.trust_level,
      lastCheckedAt: source.last_checked_at,
    })),
    lastCheckedAt,
  };
}
