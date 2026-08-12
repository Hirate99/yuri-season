import type { Account, AnimeDetail, CharacterCredit, PersonCredit } from "@/domain";
import { mapAccount, mapAnime } from "../db/mappers";
import { allRows } from "../db/query";
import { readAnimeSummaryBySlug } from "../db/read-models/anime";
import { readEventsForAnime } from "../db/read-models/catalog";
import { readBroadcasts, readCast, readSources, readStaff, readThemeSongs } from "../db/read-models/detail";
import { accountsQuery } from "../db/queries/detail";
import type { AccountRow } from "../db/rows";

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
  const row = await readAnimeSummaryBySlug(db, slug);
  if (!row) return null;

  const [broadcasts, staff, cast, accounts, events, sources, themeSongs] = await Promise.all([
    readBroadcasts(db, row.id),
    readStaff(db, row.id),
    readCast(db, row.id),
    allRows(db, accountsQuery, [row.id, row.id, row.id]),
    readEventsForAnime(db, row.id),
    readSources(db, row.id),
    readThemeSongs(db, row.id),
  ]);

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
