import type {
  AdminAccount,
  AdminAnimeResources,
  AdminCastCredit,
  AdminSource,
  AdminStaffCredit,
} from "@/domain";
import { mapBroadcast } from "../db/mappers";
import type { BroadcastRow } from "../db/rows";
import { HttpError } from "../http";
import { readAdminContentResources } from "./admin-content-resources";

export async function readAdminAnimeResources(
  db: D1Database,
  animeId: string,
): Promise<AdminAnimeResources> {
  const anime = await db.prepare("SELECT id FROM anime WHERE id = ?").bind(animeId).first();
  if (!anime) throw new HttpError(404, "没有找到这部动画。");

  const [broadcasts, accounts, staff, cast, sources, content] = await Promise.all([
    db.prepare(`
      SELECT id, label, weekday, local_time, timezone, platform_url, is_primary
      FROM broadcast_slots WHERE anime_id = ?
      ORDER BY is_primary DESC, weekday, local_time, id
    `).bind(animeId).all<BroadcastRow>(),
    db.prepare(`
      SELECT ac.id, ac.owner_type, ac.owner_id,
        CASE ac.owner_type WHEN 'anime' THEN a.title_zh ELSE p.name END AS owner_label,
        ac.platform, ac.handle, ac.url, ac.verified, ac.monitor_mode,
        ac.verification_source_url, ac.verified_at
      FROM accounts ac
      LEFT JOIN anime a ON ac.owner_type = 'anime' AND a.id = ac.owner_id
      LEFT JOIN people p ON ac.owner_type = 'person' AND p.id = ac.owner_id
      WHERE (ac.owner_type = 'anime' AND ac.owner_id = ?)
        OR (ac.owner_type = 'person' AND ac.owner_id IN (
          SELECT person_id FROM work_credits WHERE anime_id = ?
          UNION SELECT person_id FROM cast_credits WHERE anime_id = ?
        ))
      ORDER BY ac.owner_type, owner_label, ac.platform, ac.handle
    `).bind(animeId, animeId, animeId).all<{
      id: string;
      owner_type: AdminAccount["ownerType"];
      owner_id: string;
      owner_label: string | null;
      platform: string;
      handle: string | null;
      url: string;
      verified: number;
      monitor_mode: AdminAccount["monitorMode"];
      verification_source_url: string | null;
      verified_at: string | null;
    }>(),
    db.prepare(`
      SELECT wc.id, wc.person_id, p.name, p.name_native, p.primary_kind,
        wc.role, wc.profile_url, wc.sort_order
      FROM work_credits wc JOIN people p ON p.id = wc.person_id
      WHERE wc.anime_id = ? ORDER BY wc.sort_order, wc.id
    `).bind(animeId).all<{
      id: string;
      person_id: string;
      name: string;
      name_native: string | null;
      primary_kind: AdminStaffCredit["primaryKind"];
      role: string;
      profile_url: string | null;
      sort_order: number;
    }>(),
    db.prepare(`
      SELECT cc.id, cc.character_id, c.name AS character_name,
        c.name_native AS character_name_native, c.name_source_url,
        c.profile AS character_profile, c.profile_source_url,
        c.portrait_url, c.portrait_source_url, c.is_main_group,
        cc.person_id, p.name AS person_name, p.name_native AS person_name_native,
        c.birthday_month, c.birthday_day, c.birthday_year, c.birthday_timezone,
        c.birthday_source_url, c.birthday_verified, cc.sort_order
      FROM cast_credits cc
      JOIN characters c ON c.id = cc.character_id
      JOIN people p ON p.id = cc.person_id
      WHERE cc.anime_id = ? ORDER BY cc.sort_order, cc.id
    `).bind(animeId).all<{
      id: string;
      character_id: string;
      character_name: string;
      character_name_native: string | null;
      name_source_url: string | null;
      character_profile: string | null;
      profile_source_url: string | null;
      portrait_url: string | null;
      portrait_source_url: string | null;
      is_main_group: number;
      person_id: string;
      person_name: string;
      person_name_native: string | null;
      birthday_month: number | null;
      birthday_day: number | null;
      birthday_year: number | null;
      birthday_timezone: string;
      birthday_source_url: string | null;
      birthday_verified: number;
      sort_order: number;
    }>(),
    db.prepare(`
      SELECT id, account_id, source_type, change_kind, label, url,
        item_url_template, trust_level, poll_interval_min, cadence_profile, enabled
      FROM research_sources WHERE anime_id = ? ORDER BY enabled DESC, label, id
    `).bind(animeId).all<{
      id: string;
      account_id: string | null;
      source_type: AdminSource["sourceType"];
      change_kind: AdminSource["changeKind"];
      label: string;
      url: string;
      item_url_template: string | null;
      trust_level: AdminSource["trustLevel"];
      poll_interval_min: number;
      cadence_profile: AdminSource["cadenceProfile"];
      enabled: number;
    }>(),
    readAdminContentResources(db, animeId),
  ]);

  return {
    broadcasts: broadcasts.results.map(mapBroadcast),
    accounts: accounts.results.map((row) => ({
      id: row.id,
      ownerType: row.owner_type,
      ownerId: row.owner_id,
      ownerLabel: row.owner_label ?? row.owner_id,
      platform: row.platform,
      handle: row.handle,
      url: row.url,
      verified: row.verified === 1,
      monitorMode: row.monitor_mode,
      verificationSourceUrl: row.verification_source_url,
      verifiedAt: row.verified_at,
    })),
    staff: staff.results.map((row) => ({
      id: row.id,
      personId: row.person_id,
      name: row.name,
      nameNative: row.name_native,
      primaryKind: row.primary_kind,
      role: row.role,
      profileUrl: row.profile_url,
      sortOrder: row.sort_order,
    })),
    cast: cast.results.map((row) => ({
      id: row.id,
      characterId: row.character_id,
      characterName: row.character_name,
      characterNameNative: row.character_name_native,
      nameSourceUrl: row.name_source_url,
      characterProfile: row.character_profile,
      profileSourceUrl: row.profile_source_url,
      portraitUrl: row.portrait_url,
      portraitSourceUrl: row.portrait_source_url,
      isMainGroup: row.is_main_group === 1,
      personId: row.person_id,
      personName: row.person_name,
      personNameNative: row.person_name_native,
      birthdayMonth: row.birthday_month,
      birthdayDay: row.birthday_day,
      birthdayYear: row.birthday_year,
      birthdayTimezone: row.birthday_timezone,
      birthdaySourceUrl: row.birthday_source_url,
      birthdayVerified: row.birthday_verified === 1,
      sortOrder: row.sort_order,
    })),
    sources: sources.results.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      sourceType: row.source_type,
      changeKind: row.change_kind,
      label: row.label,
      url: row.url,
      itemUrlTemplate: row.item_url_template,
      trustLevel: row.trust_level,
      pollIntervalMin: row.poll_interval_min,
      cadenceProfile: row.cadence_profile,
      enabled: row.enabled === 1,
    })),
    ...content,
  };
}
