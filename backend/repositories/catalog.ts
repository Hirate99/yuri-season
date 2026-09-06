import type {
  AnimeOption,
  CatalogAnime,
  CalendarEntry,
  CalendarResponse,
  CatalogResponse,
  Season,
  SeasonsResponse,
} from "@/domain";
import { resolveCurrentEpisode } from "@/lib/episode-progress";
import { eventOccursToday } from "@/lib/calendar-events";
import { asc, count, desc, eq } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { readCatalogAnimeForSeason, type CatalogAnimeRecord } from "~/infrastructure/db/read-models/anime";
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

function mapCatalogAnime(row: CatalogAnimeRecord): CatalogAnime {
  return {
    id: row.id,
    slug: row.slug,
    titleZh: row.titleZh,
    titleJa: row.titleJa,
    yuriKind: row.yuriKind,
    yuriStatus: row.yuriStatus,
    currentEpisode: resolveCurrentEpisode(row),
    coverUrl: row.coverUrl,
    primarySlot: row.slotId && row.slotLabel && row.slotWeekday !== null && row.slotLocalTime && row.slotTimezone
      ? {
          id: row.slotId,
          label: row.slotLabel,
          weekday: row.slotWeekday,
          localTime: row.slotLocalTime,
          timezone: row.slotTimezone,
          platformUrl: row.slotPlatformUrl,
          isPrimary: true,
        }
      : null,
  };
}

export function readCurrentAnimeOptions(db: D1Database): Promise<AnimeOption[]> {
  return database(db).select({
    id: animeTable.id,
    slug: animeTable.slug,
    titleZh: animeTable.titleZh,
    titleJa: animeTable.titleJa,
    titleEn: animeTable.titleEn,
  }).from(animeTable)
    .innerJoin(seasonsTable, eq(seasonsTable.id, animeTable.seasonId))
    .where(eq(seasonsTable.isCurrent, true))
    .orderBy(asc(animeTable.titleZh));
}

export type CatalogOptions = { events?: "all" | "today" | "none"; timeZone?: string; now?: Date };

async function catalogForSeason(db: D1Database, season: Season, options: CatalogOptions): Promise<CatalogResponse> {
  const animeQuery = readCatalogAnimeForSeason(db, season.id);
  const [rows, events] = options.events === "none"
    ? [await animeQuery, []]
    : await database(db).batch([animeQuery, readEventsForSeason(db, season.id)]);
  const now = options.now ?? new Date();
  return {
    season, anime: rows.map(mapCatalogAnime),
    events: options.events === "today"
      ? events.filter((event) => eventOccursToday(event, options.timeZone ?? "Asia/Tokyo", now))
      : events,
    generatedAt: now.toISOString(),
  };
}

export async function readCatalog(db: D1Database, options: CatalogOptions = {}): Promise<CatalogResponse> {
  return catalogForSeason(db, await currentSeason(db), options);
}

export async function readCatalogForSeason(db: D1Database, slug: string, options: CatalogOptions = {}): Promise<CatalogResponse> {
  return catalogForSeason(db, await seasonBySlug(db, slug), options);
}

async function calendarForSeason(db: D1Database, season: Season): Promise<CalendarResponse> {
  const [slotRows, events] = await database(db).batch([
    readCalendarSlots(db, season.id),
    readEventsForSeason(db, season.id),
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
    currentEpisode: resolveCurrentEpisode(row),
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
