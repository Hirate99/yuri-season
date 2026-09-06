import type { AdminAnimeCoverage } from "@/domain";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { publicDiscussion, publicMedia } from "~/infrastructure/db/read-models/public-visibility";
import {
  accountsTable,
  animeTable,
  animeThemeSongsTable,
  broadcastSlotsTable,
  castCreditsTable,
  charactersTable,
  discussionAnimeTable,
  discussionsTable,
  eventsTable,
  mediaItemsTable,
  musicTracksTable,
  researchSourcesTable,
  searchMemoryTable,
  workCreditsTable,
} from "~/infrastructure/db/schema";

type CountByAnime = { animeId: string | null; count: number };

function countMap(rows: CountByAnime[]): Map<string, number> {
  return new Map(rows.flatMap((row) => (row.animeId ? [[row.animeId, row.count] as const] : [])));
}

export async function readAdminCoverage(db: D1Database): Promise<AdminAnimeCoverage[]> {
  const orm = database(db);

  const [
    anime,
    broadcasts,
    staff,
    cast,
    characters,
    accounts,
    workPeople,
    castPeople,
    sources,
    events,
    media,
    discussions,
    themes,
  ] = await orm.batch([
    orm
      .select({
        animeId: animeTable.id,
        animeTitle: animeTable.titleZh,
        seasonId: animeTable.seasonId,
        coverUrl: animeTable.coverUrl,
        mainCharacterExpected: animeTable.mainCharacterExpectedCount,
      })
      .from(animeTable)
      .orderBy(desc(animeTable.seasonId), animeTable.titleZh, animeTable.id),
    orm
      .select({ animeId: broadcastSlotsTable.animeId, count: count() })
      .from(broadcastSlotsTable)
      .groupBy(broadcastSlotsTable.animeId),
    orm
      .select({ animeId: workCreditsTable.animeId, count: count() })
      .from(workCreditsTable)
      .groupBy(workCreditsTable.animeId),
    orm
      .select({ animeId: castCreditsTable.animeId, count: count() })
      .from(castCreditsTable)
      .groupBy(castCreditsTable.animeId),
    orm
      .select({
        animeId: charactersTable.animeId,
        main: sql<number>`COUNT(DISTINCT ${charactersTable.id})`,
        sourced: sql<number>`COUNT(DISTINCT CASE WHEN ${charactersTable.profileSourceUrl} IS NOT NULL THEN ${charactersTable.id} END)`,
        named: sql<number>`COUNT(DISTINCT CASE WHEN ${charactersTable.nameSourceUrl} IS NOT NULL THEN ${charactersTable.id} END)`,
        auditedBirthdays: sql<number>`COUNT(DISTINCT CASE WHEN ${searchMemoryTable.id} IS NOT NULL THEN ${charactersTable.id} END)`,
        verifiedBirthdays: sql<number>`COUNT(DISTINCT CASE WHEN
        ${charactersTable.birthdayVerified} = 1
        AND ${charactersTable.birthdayMonth} IS NOT NULL
        AND ${charactersTable.birthdayDay} IS NOT NULL
        AND ${charactersTable.birthdaySourceUrl} IS NOT NULL
        THEN ${charactersTable.id} END)`,
      })
      .from(charactersTable)
      .leftJoin(
        searchMemoryTable,
        and(
          eq(searchMemoryTable.scopeType, "character"),
          eq(searchMemoryTable.scopeId, charactersTable.id),
          eq(searchMemoryTable.searchKind, "birthday"),
          isNotNull(searchMemoryTable.lastSearchedAt),
        ),
      )
      .where(eq(charactersTable.isMainGroup, true))
      .groupBy(charactersTable.animeId),
    orm
      .select({
        id: accountsTable.id,
        ownerType: accountsTable.ownerType,
        ownerId: accountsTable.ownerId,
      })
      .from(accountsTable)
      .where(eq(accountsTable.verified, true)),
    orm
      .select({ animeId: workCreditsTable.animeId, personId: workCreditsTable.personId })
      .from(workCreditsTable),
    orm
      .select({ animeId: castCreditsTable.animeId, personId: castCreditsTable.personId })
      .from(castCreditsTable),
    orm
      .select({ animeId: researchSourcesTable.animeId, count: count() })
      .from(researchSourcesTable)
      .where(eq(researchSourcesTable.enabled, true))
      .groupBy(researchSourcesTable.animeId),
    orm
      .select({ animeId: eventsTable.animeId, count: count() })
      .from(eventsTable)
      .where(eq(eventsTable.verified, true))
      .groupBy(eventsTable.animeId),
    orm
      .select({ animeId: mediaItemsTable.animeId, count: count() })
      .from(mediaItemsTable)
      .where(publicMedia(db))
      .groupBy(mediaItemsTable.animeId),
    orm
      .select({ animeId: discussionAnimeTable.animeId, count: count() })
      .from(discussionAnimeTable)
      .innerJoin(discussionsTable, eq(discussionsTable.id, discussionAnimeTable.discussionId))
      .where(and(eq(discussionsTable.isActive, true), publicDiscussion(db)))
      .groupBy(discussionAnimeTable.animeId),
    orm
      .select({
        animeId: animeThemeSongsTable.animeId,
        count: count(),
        covers: sql<number>`SUM(CASE WHEN ${musicTracksTable.coverUrl} IS NOT NULL
        AND ${musicTracksTable.coverSourceUrl} IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(animeThemeSongsTable)
      .innerJoin(musicTracksTable, eq(musicTracksTable.id, animeThemeSongsTable.trackId))
      .where(eq(musicTracksTable.verified, true))
      .groupBy(animeThemeSongsTable.animeId),
  ]);

  const verifiedAccounts = new Map<string, Set<string>>();
  const personAnime = new Map<string, Set<string>>();

  for (const credit of [...workPeople, ...castPeople]) {
    const animeIds = personAnime.get(credit.personId) ?? new Set<string>();

    animeIds.add(credit.animeId);
    personAnime.set(credit.personId, animeIds);
  }

  for (const account of accounts) {
    const animeIds =
      account.ownerType === "anime"
        ? [account.ownerId]
        : account.ownerType === "person"
          ? [...(personAnime.get(account.ownerId) ?? [])]
          : [];

    for (const animeId of animeIds) {
      const accountIds = verifiedAccounts.get(animeId) ?? new Set<string>();

      accountIds.add(account.id);
      verifiedAccounts.set(animeId, accountIds);
    }
  }

  const broadcastCounts = countMap(broadcasts);
  const staffCounts = countMap(staff);
  const castCounts = countMap(cast);
  const sourceCounts = countMap(sources);
  const eventCounts = countMap(events);
  const mediaCounts = countMap(media);
  const discussionCounts = countMap(discussions);
  const charactersByAnime = new Map(characters.map((row) => [row.animeId, row]));
  const themesByAnime = new Map(themes.map((row) => [row.animeId, row]));

  return anime.map((item) => {
    const character = charactersByAnime.get(item.animeId);
    const theme = themesByAnime.get(item.animeId);

    return {
      animeId: item.animeId,
      animeTitle: item.animeTitle,
      seasonId: item.seasonId,
      hasCover: item.coverUrl !== null,
      broadcasts: broadcastCounts.get(item.animeId) ?? 0,
      staff: staffCounts.get(item.animeId) ?? 0,
      cast: castCounts.get(item.animeId) ?? 0,
      mainCharacters: character?.main ?? 0,
      mainCharacterExpected: item.mainCharacterExpected,
      sourcedMainCharacters: character?.sourced ?? 0,
      namedMainCharacters: character?.named ?? 0,
      auditedMainBirthdays: character?.auditedBirthdays ?? 0,
      verifiedMainBirthdays: character?.verifiedBirthdays ?? 0,
      verifiedAccounts: verifiedAccounts.get(item.animeId)?.size ?? 0,
      sources: sourceCounts.get(item.animeId) ?? 0,
      verifiedEvents: eventCounts.get(item.animeId) ?? 0,
      media: mediaCounts.get(item.animeId) ?? 0,
      discussions: discussionCounts.get(item.animeId) ?? 0,
      themeSongs: theme?.count ?? 0,
      themeSongCovers: theme?.covers ?? 0,
    };
  });
}
