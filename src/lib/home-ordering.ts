import type { CatalogAnime } from "@/domain";
import { broadcastInstantOnViewerDate } from "@/lib/timezone";

const DAY_MS = 24 * 60 * 60 * 1_000;

export function localDayOrdinal(timeZone: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Math.floor(Date.UTC(value("year"), value("month") - 1, value("day")) / DAY_MS);
}

function airingInstant(
  anime: CatalogAnime,
  viewerTimeZone: string,
  now: Date,
): Date | null {
  if (!anime.primarySlot) return null;
  return broadcastInstantOnViewerDate(anime.primarySlot, viewerTimeZone, now);
}

export function partitionByAiringToday<T extends CatalogAnime>(
  anime: T[],
  viewerTimeZone: string,
  now: Date,
): { airingToday: T[]; rest: T[] } {
  const airingToday: { anime: T; instant: Date }[] = [];
  const rest: T[] = [];
  for (const item of anime) {
    const instant = airingInstant(item, viewerTimeZone, now);
    if (instant) airingToday.push({ anime: item, instant });
    else rest.push(item);
  }
  airingToday.sort((a, b) => a.instant.valueOf() - b.instant.valueOf());
  return { airingToday: airingToday.map((entry) => entry.anime), rest };
}

export function rotateList<T>(list: T[], seed: number): T[] {
  if (list.length <= 1) return list;
  const offset = ((seed % list.length) + list.length) % list.length;
  return [...list.slice(offset), ...list.slice(0, offset)];
}

export function orderWorksForToday<T extends CatalogAnime>(
  anime: T[],
  viewerTimeZone: string,
  now: Date,
): T[] {
  const { airingToday, rest } = partitionByAiringToday(anime, viewerTimeZone, now);
  return [...airingToday, ...rest];
}

export function orderBannerForHome<T extends CatalogAnime>(
  anime: T[],
  viewerTimeZone: string,
  now: Date,
): T[] {
  const { airingToday, rest } = partitionByAiringToday(anime, viewerTimeZone, now);
  return [...airingToday, ...rotateList(rest, localDayOrdinal(viewerTimeZone, now))];
}
