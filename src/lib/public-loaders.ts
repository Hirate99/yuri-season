import { createIsomorphicFn } from "@tanstack/react-start";
import type { AnimePageResponse, CatalogResponse, PublicationDetailResponse } from "@/domain";
import type { ServerRequestContext } from "@/server-context";
import { eventOccursToday } from "./calendar-events";
import { apiClient, rpcData } from "./api";

export type PublicLoadContext = { serverContext?: ServerRequestContext };

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
  } catch {
    return "Asia/Tokyo";
  }
}

function database(context: PublicLoadContext) {
  if (!context.serverContext) throw new Error("Server request context is unavailable.");
  return context.serverContext.env.DB;
}

function catalogForHome(
  catalog: CatalogResponse,
  viewerTimeZone: string,
  renderedAt: string,
  includeToday: boolean,
): CatalogResponse {
  const now = new Date(renderedAt);
  return {
    ...catalog,
    events: includeToday
      ? catalog.events.filter((event) => eventOccursToday(event, viewerTimeZone, now))
      : [],
  };
}

export const loadHomeData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { seasonSlug?: string }) => {
    const renderedAt = new Date().toISOString();
    const viewerTimeZone = input.serverContext?.viewerTimeZone ?? "Asia/Tokyo";
    if (input.seasonSlug) {
      const { readCatalogForSeason } = await import("~/repositories/catalog");
      const catalog = await readCatalogForSeason(database(input), input.seasonSlug);
      return {
        catalog: catalogForHome(catalog, viewerTimeZone, renderedAt, false),
        feed: null,
        viewerTimeZone,
        renderedAt,
      };
    }
    const [{ readCatalog }, { readFeed }] = await Promise.all([
      import("~/repositories/catalog"),
      import("~/repositories/feed"),
    ]);
    const [catalog, feed] = await Promise.all([
      readCatalog(database(input)),
      readFeed(database(input), { limit: 6 }),
    ]);
    return {
      catalog: catalogForHome(catalog, viewerTimeZone, renderedAt, true),
      feed,
      viewerTimeZone,
      renderedAt,
    };
  })
  .client(async (input: PublicLoadContext & { seasonSlug?: string }) => {
    const viewerTimeZone = browserTimeZone();
    const renderedAt = new Date().toISOString();
    if (input.seasonSlug) {
      const catalog = await rpcData(apiClient.api.seasons[":slug"].$get({ param: { slug: input.seasonSlug } }));
      return {
        catalog: catalogForHome(catalog, viewerTimeZone, renderedAt, false),
        feed: null,
        viewerTimeZone,
        renderedAt,
      };
    }
    const [catalog, feed] = await Promise.all([
      rpcData(apiClient.api.catalog.$get()),
      rpcData(apiClient.api.feed.$get({ query: { limit: "6" } })),
    ]);
    return {
      catalog: catalogForHome(catalog, viewerTimeZone, renderedAt, true),
      feed,
      viewerTimeZone,
      renderedAt,
    };
  });

export const loadCalendarData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { seasonSlug?: string }) => {
    const repository = await import("~/repositories/catalog");
    return input.seasonSlug
      ? repository.readCalendarForSeason(database(input), input.seasonSlug)
      : repository.readCalendar(database(input));
  })
  .client((input: PublicLoadContext & { seasonSlug?: string }) => input.seasonSlug
    ? rpcData(apiClient.api.seasons[":slug"].calendar.$get({ param: { slug: input.seasonSlug } }))
    : rpcData(apiClient.api.calendar.$get()));

export const loadFeedData = createIsomorphicFn()
  .server(async (input: PublicLoadContext) => {
    const [{ readFeed }, { readCurrentAnimeOptions }] = await Promise.all([
      import("~/repositories/feed"),
      import("~/repositories/catalog"),
    ]);
    const [feed, animeOptions] = await Promise.all([
      readFeed(database(input), { limit: 20 }),
      readCurrentAnimeOptions(database(input)),
    ]);
    return { feed, animeOptions };
  })
  .client(async () => {
    const [feed, animeOptions] = await Promise.all([
      rpcData(apiClient.api.feed.$get({ query: { limit: "20" } })),
      rpcData(apiClient.api.catalog.options.$get()),
    ]);
    return { feed, animeOptions };
  });

export const loadAnimeData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { slug: string }): Promise<AnimePageResponse> => {
    const { readAnimePage } = await import("~/application/public/service");
    const page = await readAnimePage(database(input), input.slug);
    if (!page) throw new Error("没有找到这部动画。");
    return page;
  })
  .client((input: PublicLoadContext & { slug: string }) =>
    rpcData(apiClient.api.anime[":slug"].$get({ param: { slug: input.slug } })));

export const loadPublicationData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { id: string }): Promise<PublicationDetailResponse> => {
    const { readPublicationPage } = await import("~/application/public/service");
    const page = await readPublicationPage(database(input), input.id);
    if (!page) throw new Error("没有找到这条情报。");
    return page;
  })
  .client((input: PublicLoadContext & { id: string }) =>
    rpcData(apiClient.api.updates[":id"].$get({ param: { id: input.id } })));

export const loadSeasonsData = createIsomorphicFn()
  .server(async (input: PublicLoadContext) => {
    const { readSeasons } = await import("~/repositories/catalog");
    return readSeasons(database(input));
  })
  .client(() => rpcData(apiClient.api.seasons.$get()));
