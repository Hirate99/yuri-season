import type { Account, AnimeDetail, CharacterCredit, PersonCredit } from "@/domain";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { mapAnime } from "~/infrastructure/db/mappers";
import { readAnimeSummaryBySlug } from "~/infrastructure/db/read-models/anime";
import { readEventsForAnime } from "~/infrastructure/db/read-models/catalog";
import { readBroadcasts, readCast, readSources, readStaff, readThemeSongs } from "~/infrastructure/db/read-models/detail";
import { accountsTable } from "~/infrastructure/db/schema";

type AccountRecord = Account & { ownerId: string };

function groupAccounts(rows: AccountRecord[]): Map<string, Account[]> {
  const grouped = new Map<string, Account[]>();
  for (const row of rows) {
    const accounts = grouped.get(row.ownerId) ?? [];
    accounts.push({
      id: row.id,
      platform: row.platform,
      handle: row.handle,
      url: row.url,
      verified: row.verified,
    });
    grouped.set(row.ownerId, accounts);
  }
  return grouped;
}

function readAccounts(db: D1Database, animeId: string, personIds: string[]): Promise<AccountRecord[]> {
  const personCondition = personIds.length > 0
    ? and(eq(accountsTable.ownerType, "person"), inArray(accountsTable.ownerId, personIds))
    : undefined;
  return database(db).select({
    id: accountsTable.id,
    ownerId: accountsTable.ownerId,
    platform: accountsTable.platform,
    handle: accountsTable.handle,
    url: accountsTable.url,
    verified: accountsTable.verified,
  }).from(accountsTable)
    .where(or(
      and(eq(accountsTable.ownerType, "anime"), eq(accountsTable.ownerId, animeId)),
      personCondition,
    ))
    .orderBy(desc(accountsTable.verified), asc(accountsTable.platform), asc(accountsTable.handle));
}

function timestampValue(value: string): number {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  return Date.parse(normalized);
}

export async function readAnimeDetail(db: D1Database, slug: string): Promise<AnimeDetail | null> {
  const row = await readAnimeSummaryBySlug(db, slug);
  if (!row) return null;

  const [broadcasts, staff, cast, events, sources, themeSongs] = await Promise.all([
    readBroadcasts(db, row.id),
    readStaff(db, row.id),
    readCast(db, row.id),
    readEventsForAnime(db, row.id),
    readSources(db, row.id),
    readThemeSongs(db, row.id),
  ]);

  const personIds = [...new Set([...staff, ...cast].map((credit) => credit.personId))];
  const accounts = await readAccounts(db, row.id, personIds);

  const accountsByOwner = groupAccounts(accounts);
  const staffCredits: PersonCredit[] = staff.map((item) => ({
    id: item.id,
    personId: item.personId,
    role: item.role,
    name: item.name,
    nameNative: item.nameNative,
    profileUrl: item.profileUrl,
    accounts: accountsByOwner.get(item.personId) ?? [],
  }));
  const castCredits: CharacterCredit[] = cast.map((item) => ({
    id: item.id,
    characterId: item.characterId,
    personId: item.personId,
    characterName: item.characterName,
    characterNameNative: item.characterNameNative,
    nameSourceUrl: item.nameSourceUrl,
    characterProfile: item.characterProfile,
    profileSourceUrl: item.profileSourceUrl,
    portraitUrl: item.portraitUrl,
    portraitSourceUrl: item.portraitSourceUrl,
    personName: item.personName,
    personNameNative: item.personNameNative,
    birthdayMonth: item.birthdayMonth,
    birthdayDay: item.birthdayDay,
    birthdayVerified: item.birthdayVerified,
    accounts: accountsByOwner.get(item.personId) ?? [],
  }));
  const sourceRows = [...new Map(sources.map((source) => [source.url, source])).values()];
  const lastCheckedAt = sourceRows.reduce<string | null>((latest, source) => {
    if (!source.lastCheckedAt) return latest;
    if (!latest) return source.lastCheckedAt;
    return timestampValue(source.lastCheckedAt) > timestampValue(latest) ? source.lastCheckedAt : latest;
  }, null);

  return {
    ...mapAnime(row),
    episodeDurationMin: row.episodeDurationMin,
    sourceMaterial: row.sourceMaterial,
    broadcasts,
    staff: staffCredits,
    cast: castCredits,
    accounts: accountsByOwner.get(row.id) ?? [],
    events,
    themeSongs,
    sources: sourceRows,
    lastCheckedAt,
  };
}
