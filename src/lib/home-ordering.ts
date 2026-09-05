import type { CatalogAnime } from "@/domain";
import { broadcastInstantOnViewerDate, nextBroadcastInstant } from "@/lib/timezone";

export function orderByNextBroadcast<T extends CatalogAnime>(anime: T[], now: Date): T[] {
  return anime
    .map((item) => ({
      anime: item,
      instant: item.primarySlot ? nextBroadcastInstant(item.primarySlot, now).valueOf() : Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => left.instant - right.instant || left.anime.id.localeCompare(right.anime.id))
    .map(({ anime: item }) => item);
}

export function orderByBroadcastFromToday<T extends CatalogAnime>(anime: T[], viewerTimeZone: string, now: Date): T[] {
  const { airingToday, rest } = partitionByAiringToday(anime, viewerTimeZone, now);
  return [...airingToday, ...orderByNextBroadcast(rest, now)];
}

export function partitionByAiringToday<T extends CatalogAnime>(
  anime: T[],
  viewerTimeZone: string,
  now: Date,
): { airingToday: T[]; rest: T[] } {
  const airingToday: { anime: T; instant: Date }[] = [];
  const rest: T[] = [];
  for (const item of anime) {
    const instant = item.primarySlot && broadcastInstantOnViewerDate(item.primarySlot, viewerTimeZone, now);
    if (instant) airingToday.push({ anime: item, instant });
    else rest.push(item);
  }
  airingToday.sort((a, b) => a.instant.valueOf() - b.instant.valueOf());
  return { airingToday: airingToday.map((entry) => entry.anime), rest };
}
