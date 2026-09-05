import type { Account, AnimeDetail } from "@/domain";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { mapAnime } from "~/infrastructure/db/mappers";
import { readAnimeSummaryBySlug } from "~/infrastructure/db/read-models/anime";
import { readEventsForAnime } from "~/infrastructure/db/read-models/catalog";
import { readBroadcasts, readCast, readSources, readStaff, readThemeSongs } from "~/infrastructure/db/read-models/detail";
import { accountsTable, animeTable, castCreditsTable, charactersTable, workCreditsTable } from "~/infrastructure/db/schema";

type AccountRecord = Account & { ownerId: string };

function groupAccounts(rows: AccountRecord[]): Map<string, Account[]> {
  const grouped = new Map<string, Account[]>();
  for (const { ownerId, ...account } of rows) {
    const accounts = grouped.get(ownerId) ?? [];
    accounts.push(account);
    grouped.set(ownerId, accounts);
  }
  return grouped;
}

function readAccounts(db: D1Database, animeId: string) {
  const orm = database(db);
  const personIds = orm.select({ id: workCreditsTable.personId }).from(workCreditsTable)
    .where(eq(workCreditsTable.animeId, animeId))
    .unionAll(orm.select({ id: castCreditsTable.personId }).from(castCreditsTable)
      .innerJoin(charactersTable, eq(charactersTable.id, castCreditsTable.characterId))
      .where(and(eq(castCreditsTable.animeId, animeId), eq(charactersTable.isMainGroup, true))));
  return orm.select({
    id: accountsTable.id,
    ownerId: accountsTable.ownerId,
    platform: accountsTable.platform,
    handle: accountsTable.handle,
    url: accountsTable.url,
    verified: accountsTable.verified,
  }).from(accountsTable)
    .where(or(
      and(eq(accountsTable.ownerType, "anime"), eq(accountsTable.ownerId, animeId)),
      and(eq(accountsTable.ownerType, "person"), inArray(accountsTable.ownerId, personIds)),
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

  const [broadcasts, staff, cast, events, sources, themeSongs, accounts] = await database(db).batch([
    readBroadcasts(db, row.id),
    readStaff(db, row.id),
    readCast(db, row.id),
    readEventsForAnime(db, row.id),
    readSources(db, row.id),
    readThemeSongs(db, row.id),
    readAccounts(db, row.id),
  ]);

  const accountsByOwner = groupAccounts(accounts);
  const withAccounts = <T extends { personId: string }>(item: T) => ({
    ...item,
    accounts: accountsByOwner.get(item.personId) ?? [],
  });
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
    staff: staff.map(withAccounts),
    cast: cast.map(withAccounts),
    accounts: accountsByOwner.get(row.id) ?? [],
    events,
    themeSongs: themeSongs.flatMap((song) => song.sourceUrl ? [{ ...song, sourceUrl: song.sourceUrl }] : []),
    sources: sourceRows,
    lastCheckedAt,
  };
}

export async function readAnimeId(db: D1Database, slug: string): Promise<string | null> {
  const [row] = await database(db).select({ id: animeTable.id })
    .from(animeTable)
    .where(eq(animeTable.slug, slug))
    .limit(1);
  return row?.id ?? null;
}
