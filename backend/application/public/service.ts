import type { AnimePageResponse } from "@/domain";

import { readCalendar, readCalendarForSeason, readCatalog, readCatalogForSeason, readSeasons } from "~/repositories/catalog";
import { readAnimeDetail } from "~/repositories/detail";
import { readDiscussions, readFeed, readMedia, type FeedOptions } from "~/repositories/feed";

/** Shared application read model used by SSR and the public API. */
export async function readAnimePage(db: D1Database, slug: string): Promise<AnimePageResponse | null> {
  const anime = await readAnimeDetail(db, slug);
  if (!anime) return null;
  const [feed, media, discussions] = await Promise.all([
    readFeed(db, { animeId: anime.id, limit: 40 }),
    readMedia(db, anime.id),
    readDiscussions(db, anime.id),
  ]);
  return { anime, feed: feed.items, media, discussions };
}

export function createPublicService(env: Env) {
  return {
    anime: { page: (slug: string) => readAnimePage(env.DB, slug) },
    calendar: {
      current: () => readCalendar(env.DB),
      season: (slug: string) => readCalendarForSeason(env.DB, slug),
    },
    catalog: {
      current: () => readCatalog(env.DB),
      season: (slug: string) => readCatalogForSeason(env.DB, slug),
    },
    feed: (request: FeedOptions) => readFeed(env.DB, request),
    seasons: () => readSeasons(env.DB),
  };
}
