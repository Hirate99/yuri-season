import type {
  AnimeSummary,
  CalendarEntry,
  CalendarResponse,
  CatalogResponse,
  Season,
  SeasonsResponse,
} from "@/domain";
import { resolveCurrentEpisode } from "@/lib/episode-progress";
import { count, desc, eq } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { mapAnime } from "~/infrastructure/db/mappers";
import { readAnimeSummariesForSeason } from "~/infrastructure/db/read-models/anime";
import { readCalendarSlots, readEventsForSeason } from "~/infrastructure/db/read-models/catalog";
import { animeTable, seasonsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";

const seasonProjection = {
  id: seasonsTable.id,
  slug: seasonsTable.slug,
  label: seasonsTable.label,
  startsOn: seasonsTable.startsOn,
  endsOn: seasonsTable.endsOn,
};

export async function currentSeason(db: D1Database): Promise<Season> {
  const [row] = await database(db).select(seasonProjection)
    .from(seasonsTable)
    .where(eq(seasonsTable.isCurrent, true))
    .limit(1);
  if (!row) throw new HttpError(503, "The current season has not been configured.");
  return row;
}

export async function seasonBySlug(db: D1Database, slug: string): Promise<Season> {
  const [row] = await database(db).select(seasonProjection)
    .from(seasonsTable)
    .where(eq(seasonsTable.slug, slug))
    .limit(1);
  if (!row) throw new HttpError(404, "Season not found.");
  return row;
}

export async function readSeasons(db: D1Database): Promise<SeasonsResponse> {
  const seasons = await database(db).select({
    ...seasonProjection,
    isCurrent: seasonsTable.isCurrent,
    animeCount: count(animeTable.id),
  }).from(seasonsTable)
    .leftJoin(animeTable, eq(animeTable.seasonId, seasonsTable.id))
    .groupBy(seasonsTable.id)
    .orderBy(desc(seasonsTable.startsOn));
  return {
    seasons,
    currentSlug: seasons.find((season) => season.isCurrent)?.slug ?? null,
  };
}

export async function animeForSeason(db: D1Database, seasonId: string): Promise<AnimeSummary[]> {
  return (await readAnimeSummariesForSeason(db, seasonId)).map(mapAnime);
}

export async function eventsForSeason(db: D1Database, seasonId: string) {
  return readEventsForSeason(db, seasonId);
}

async function catalogForSeason(db: D1Database, season: Season): Promise<CatalogResponse> {
  const [anime, events] = await Promise.all([
    animeForSeason(db, season.id),
    eventsForSeason(db, season.id),
  ]);
  return { season, anime, events, generatedAt: new Date().toISOString() };
}

export async function readCatalog(db: D1Database): Promise<CatalogResponse> {
  return catalogForSeason(db, await currentSeason(db));
}

export async function readCatalogForSeason(db: D1Database, slug: string): Promise<CatalogResponse> {
  return catalogForSeason(db, await seasonBySlug(db, slug));
}

async function calendarForSeason(db: D1Database, season: Season): Promise<CalendarResponse> {
  const [slotRows, events] = await Promise.all([
    readCalendarSlots(db, season.id),
    eventsForSeason(db, season.id),
  ]);
  const entries: CalendarEntry[] = slotRows.map((row) => ({
    animeId: row.animeId,
    animeSlug: row.animeSlug,
    titleZh: row.titleZh,
    titleJa: row.titleJa,
    yuriKind: row.yuriKind,
    yuriStatus: row.yuriStatus,
    visualTheme: row.visualTheme,
    coverUrl: row.coverUrl,
    currentEpisode: resolveCurrentEpisode({
      status: row.status,
      premiereAt: row.premiereAt,
      episodeCount: row.episodeCount,
      premiereEpisodeCount: row.premiereEpisodeCount,
      latestVerifiedEpisode: row.latestVerifiedEpisode,
    }),
    slot: {
      id: row.slotId,
      label: row.slotLabel,
      weekday: row.slotWeekday,
      localTime: row.slotLocalTime,
      timezone: row.slotTimezone,
      platformUrl: row.slotPlatformUrl,
      isPrimary: row.slotIsPrimary,
    },
  }));
  return { season, entries, events };
}

export async function readCalendar(db: D1Database): Promise<CalendarResponse> {
  return calendarForSeason(db, await currentSeason(db));
}

export async function readCalendarForSeason(db: D1Database, slug: string): Promise<CalendarResponse> {
  return calendarForSeason(db, await seasonBySlug(db, slug));
}
