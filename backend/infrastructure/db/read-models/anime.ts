import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  isNull,
  max,
  sql,
  type SQL,
} from "drizzle-orm";
import { database } from "../client";
import { animeTable, broadcastSlotsTable, feedItemsTable, seasonsTable } from "../schema";

const {
  parentAnimeId: _parentAnimeId,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
  ...publicAnimeColumns
} = getTableColumns(animeTable);

const animeSummarySelection = {
  ...publicAnimeColumns,
  seasonLabel: seasonsTable.label,
  seasonStartsOn: seasonsTable.startsOn,
  slotId: broadcastSlotsTable.id,
  slotLabel: broadcastSlotsTable.label,
  slotWeekday: broadcastSlotsTable.weekday,
  slotLocalTime: broadcastSlotsTable.localTime,
  slotTimezone: broadcastSlotsTable.timezone,
  slotPlatformUrl: broadcastSlotsTable.platformUrl,
  latestFeedAt: max(feedItemsTable.publishedAt).as("latest_feed_at"),
  feedCount: count(feedItemsTable.id).as("feed_count"),
};

function animeSummaryQuery(db: D1Database, where?: SQL) {
  return database(db)
    .select(animeSummarySelection)
    .from(animeTable)
    .innerJoin(seasonsTable, eq(seasonsTable.id, animeTable.seasonId))
    .leftJoin(
      broadcastSlotsTable,
      and(eq(broadcastSlotsTable.animeId, animeTable.id), eq(broadcastSlotsTable.isPrimary, true)),
    )
    .leftJoin(
      feedItemsTable,
      and(eq(feedItemsTable.animeId, animeTable.id), isNull(feedItemsTable.withdrawnAt)),
    )
    .groupBy(animeTable.id, broadcastSlotsTable.id)
    .where(where);
}

export type AnimeSummaryRecord = Awaited<ReturnType<typeof readAllAnimeSummaries>>[number];

const catalogAnimeSelection = {
  id: animeTable.id,
  slug: animeTable.slug,
  titleZh: animeTable.titleZh,
  titleJa: animeTable.titleJa,
  yuriKind: animeTable.yuriKind,
  yuriStatus: animeTable.yuriStatus,
  status: animeTable.status,
  premiereAt: animeTable.premiereAt,
  episodeCount: animeTable.episodeCount,
  premiereEpisodeCount: animeTable.premiereEpisodeCount,
  latestVerifiedEpisode: animeTable.latestVerifiedEpisode,
  coverUrl: animeTable.coverUrl,
  slotId: sql<string | null>`${broadcastSlotsTable.id}`.as("slot_id"),
  slotLabel: broadcastSlotsTable.label,
  slotWeekday: broadcastSlotsTable.weekday,
  slotLocalTime: broadcastSlotsTable.localTime,
  slotTimezone: broadcastSlotsTable.timezone,
  slotPlatformUrl: broadcastSlotsTable.platformUrl,
};

export function readCatalogAnimeForSeason(db: D1Database, seasonId: string) {
  return database(db)
    .select(catalogAnimeSelection)
    .from(animeTable)
    .leftJoin(
      broadcastSlotsTable,
      and(eq(broadcastSlotsTable.animeId, animeTable.id), eq(broadcastSlotsTable.isPrimary, true)),
    )
    .where(eq(animeTable.seasonId, seasonId))
    .orderBy(
      desc(animeTable.featured),
      asc(broadcastSlotsTable.weekday),
      asc(broadcastSlotsTable.localTime),
      asc(animeTable.titleZh),
    );
}

export type CatalogAnimeRecord = Awaited<ReturnType<typeof readCatalogAnimeForSeason>>[number];

export async function readAnimeSummaryBySlug(db: D1Database, slug: string) {
  const [row] = await animeSummaryQuery(db, eq(animeTable.slug, slug)).limit(1);

  return row ?? null;
}

export function readAllAnimeSummaries(db: D1Database) {
  return animeSummaryQuery(db).orderBy(
    desc(seasonsTable.startsOn),
    desc(animeTable.featured),
    asc(broadcastSlotsTable.weekday),
    asc(broadcastSlotsTable.localTime),
    asc(animeTable.titleZh),
  );
}
