import { and, asc, eq, sql } from "drizzle-orm";
import { database } from "../client";
import { animeTable, broadcastSlotsTable, charactersTable, eventsTable } from "../schema";

const eventSelection = {
  id: eventsTable.id,
  animeId: eventsTable.animeId,
  animeSlug: animeTable.slug,
  animeTitle: animeTable.titleZh,
  characterId: eventsTable.characterId,
  characterName: charactersTable.name,
  characterPortraitUrl: charactersTable.portraitUrl,
  characterPortraitSourceUrl: charactersTable.portraitSourceUrl,
  eventType: eventsTable.eventType,
  title: eventsTable.title,
  startsAt: eventsTable.startsAt,
  timezone: eventsTable.timezone,
  recurrenceRule: eventsTable.recurrenceRule,
  sourceUrl: eventsTable.sourceUrl,
  verified: eventsTable.verified,
};

function eventQuery(db: D1Database) {
  return database(db).select(eventSelection)
    .from(eventsTable)
    .leftJoin(animeTable, eq(animeTable.id, eventsTable.animeId))
    .leftJoin(charactersTable, eq(charactersTable.id, eventsTable.characterId))
    .$dynamic();
}

export function readEventsForSeason(db: D1Database, seasonId: string) {
  return eventQuery(db).where(and(
    eq(animeTable.seasonId, seasonId),
    eq(eventsTable.status, "scheduled"),
    eq(eventsTable.verified, true),
  )).orderBy(asc(eventsTable.startsAt), asc(eventsTable.title));
}

export function readEventsForAnime(db: D1Database, animeId: string) {
  return eventQuery(db).where(and(
    eq(eventsTable.animeId, animeId),
    eq(eventsTable.verified, true),
  )).orderBy(asc(eventsTable.startsAt), asc(eventsTable.title));
}

export function readCalendarSlots(db: D1Database, seasonId: string) {
  return database(db).select({
    animeId: animeTable.id,
    animeSlug: animeTable.slug,
    titleZh: animeTable.titleZh,
    titleJa: animeTable.titleJa,
    yuriKind: animeTable.yuriKind,
    yuriStatus: animeTable.yuriStatus,
    visualTheme: animeTable.visualTheme,
    coverUrl: animeTable.coverUrl,
    status: animeTable.status,
    premiereAt: animeTable.premiereAt,
    episodeCount: animeTable.episodeCount,
    premiereEpisodeCount: animeTable.premiereEpisodeCount,
    latestVerifiedEpisode: animeTable.latestVerifiedEpisode,
    slotId: sql<string>`${broadcastSlotsTable.id}`.as("slot_id"),
    slotLabel: broadcastSlotsTable.label,
    slotWeekday: broadcastSlotsTable.weekday,
    slotLocalTime: broadcastSlotsTable.localTime,
    slotTimezone: broadcastSlotsTable.timezone,
    slotPlatformUrl: broadcastSlotsTable.platformUrl,
    slotIsPrimary: broadcastSlotsTable.isPrimary,
  }).from(animeTable)
    .innerJoin(broadcastSlotsTable, eq(broadcastSlotsTable.animeId, animeTable.id))
    .where(eq(animeTable.seasonId, seasonId))
    .orderBy(
      asc(broadcastSlotsTable.weekday),
      asc(broadcastSlotsTable.localTime),
      asc(animeTable.titleZh),
    );
}
