import type { AnimePageResponse, AnimeRelatedResponse, PublicationDetailResponse } from "@/domain";

import {
  readCalendar,
  readCalendarForSeason,
  readCatalog,
  readCatalogForSeason,
  readCurrentAnimeOptions,
  readSeasons,
} from "~/repositories/catalog";
import { readAnimeDetail, readAnimeId } from "~/repositories/detail";
import { readDiscussions, readFeed, readFeedItem, readMedia, type FeedOptions } from "~/repositories/feed";
import {
  readPublicationAssets,
  readPublicationCorrections,
  readPublicationDocument,
} from "~/repositories/publications";

/** Shared application read model used by SSR and the public API. */
export async function readAnimePage(db: D1Database, slug: string): Promise<AnimePageResponse | null> {
  const anime = await readAnimeDetail(db, slug);
  if (!anime) return null;
  return { anime };
}

export async function readAnimeRelated(
  db: D1Database,
  slug: string,
): Promise<AnimeRelatedResponse | null> {
  const animeId = await readAnimeId(db, slug);
  if (!animeId) return null;
  const [feed, media, discussions] = await Promise.all([
    readFeed(db, { animeId, limit: 40 }),
    readMedia(db, animeId),
    readDiscussions(db, animeId),
  ]);
  return { feed: feed.items, media, discussions };
}

export async function readPublicationPage(
  db: D1Database,
  id: string,
): Promise<PublicationDetailResponse | null> {
  const [item, document, corrections] = await Promise.all([
    readFeedItem(db, id),
    readPublicationDocument(db, id),
    readPublicationCorrections(db, id),
  ]);
  if (!item) return null;
  const assets = await readPublicationAssets(db, item.media?.id ?? null);
  return { item, document, assets, corrections };
}

export function createPublicService(env: Env) {
  return {
    anime: {
      page: (slug: string) => readAnimePage(env.DB, slug),
      related: (slug: string) => readAnimeRelated(env.DB, slug),
    },
    calendar: {
      current: () => readCalendar(env.DB),
      season: (slug: string) => readCalendarForSeason(env.DB, slug),
    },
    catalog: {
      current: () => readCatalog(env.DB),
      options: () => readCurrentAnimeOptions(env.DB),
      season: (slug: string) => readCatalogForSeason(env.DB, slug),
    },
    feed: (request: FeedOptions) => readFeed(env.DB, request),
    publications: { page: (id: string) => readPublicationPage(env.DB, id) },
    seasons: () => readSeasons(env.DB),
  };
}
