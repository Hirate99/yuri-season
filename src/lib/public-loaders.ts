import { createIsomorphicFn } from "@tanstack/react-start";
import type {
  AnimePageResponse,
  CalendarResponse,
  CatalogResponse,
  FeedResponse,
  SeasonsResponse,
} from "@/domain";
import type { ServerRequestContext } from "@/server-context";
import { apiRequest } from "./api";

export type PublicLoadContext = { serverContext?: ServerRequestContext };

function database(context: PublicLoadContext) {
  if (!context.serverContext) throw new Error("Server request context is unavailable.");
  return context.serverContext.env.DB;
}

export const loadHomeData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { seasonSlug?: string }) => {
    const repository = await import("@worker/repositories/catalog");
    const catalog = input.seasonSlug
      ? await repository.readCatalogForSeason(database(input), input.seasonSlug)
      : await repository.readCatalog(database(input));
    if (input.seasonSlug) return { catalog, feed: null };
    const { readFeed } = await import("@worker/repositories/feed");
    return { catalog, feed: await readFeed(database(input), { limit: 6 }) };
  })
  .client(async (input: PublicLoadContext & { seasonSlug?: string }) => ({
    catalog: await apiRequest<CatalogResponse>(input.seasonSlug
      ? `/api/seasons/${encodeURIComponent(input.seasonSlug)}`
      : "/api/catalog"),
    feed: input.seasonSlug ? null : await apiRequest<FeedResponse>("/api/feed?limit=6"),
  }));

export const loadCalendarData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { seasonSlug?: string }) => {
    const repository = await import("@worker/repositories/catalog");
    return input.seasonSlug
      ? repository.readCalendarForSeason(database(input), input.seasonSlug)
      : repository.readCalendar(database(input));
  })
  .client((input: PublicLoadContext & { seasonSlug?: string }) => apiRequest<CalendarResponse>(input.seasonSlug
    ? `/api/seasons/${encodeURIComponent(input.seasonSlug)}/calendar`
    : "/api/calendar"));

export const loadFeedData = createIsomorphicFn()
  .server(async (input: PublicLoadContext) => {
    const [{ readFeed }, { readCatalog }] = await Promise.all([
      import("@worker/repositories/feed"),
      import("@worker/repositories/catalog"),
    ]);
    const [feed, catalog] = await Promise.all([
      readFeed(database(input), { limit: 20 }),
      readCatalog(database(input)),
    ]);
    return { feed, catalog };
  })
  .client(async () => ({
    feed: await apiRequest<FeedResponse>("/api/feed?limit=20"),
    catalog: await apiRequest<CatalogResponse>("/api/catalog"),
  }));

export const loadAnimeData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { slug: string }): Promise<AnimePageResponse> => {
    const db = database(input);
    const [{ readAnimeDetail }, { readDiscussions, readFeed, readMedia }] = await Promise.all([
      import("@worker/repositories/detail"),
      import("@worker/repositories/feed"),
    ]);
    const anime = await readAnimeDetail(db, input.slug);
    if (!anime) throw new Error("没有找到这部动画。");
    const [feed, media, discussions] = await Promise.all([
      readFeed(db, { animeId: anime.id, limit: 40 }),
      readMedia(db, anime.id),
      readDiscussions(db, anime.id),
    ]);
    return { anime, feed: feed.items, media, discussions };
  })
  .client((input: PublicLoadContext & { slug: string }) =>
    apiRequest<AnimePageResponse>(`/api/anime/${encodeURIComponent(input.slug)}`));

export const loadSeasonsData = createIsomorphicFn()
  .server(async (input: PublicLoadContext) => {
    const { readSeasons } = await import("@worker/repositories/catalog");
    return readSeasons(database(input));
  })
  .client(() => apiRequest<SeasonsResponse>("/api/seasons"));
