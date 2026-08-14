import { createIsomorphicFn } from "@tanstack/react-start";
import type { AnimePageResponse, PublicationDetailResponse } from "@/domain";
import type { ServerRequestContext } from "@/server-context";
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

export const loadHomeData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { seasonSlug?: string }) => {
    const renderedAt = new Date().toISOString();
    const repository = await import("~/repositories/catalog");
    const catalog = input.seasonSlug
      ? await repository.readCatalogForSeason(database(input), input.seasonSlug)
      : await repository.readCatalog(database(input));
    if (input.seasonSlug) return {
      catalog,
      feed: null,
      viewerTimeZone: input.serverContext?.viewerTimeZone ?? "Asia/Tokyo",
      renderedAt,
    };
    const { readFeed } = await import("~/repositories/feed");
    return {
      catalog,
      feed: await readFeed(database(input), { limit: 6 }),
      viewerTimeZone: input.serverContext?.viewerTimeZone ?? "Asia/Tokyo",
      renderedAt,
    };
  })
  .client(async (input: PublicLoadContext & { seasonSlug?: string }) => ({
    catalog: await (input.seasonSlug
      ? rpcData(apiClient.api.seasons[":slug"].$get({ param: { slug: input.seasonSlug } }))
      : rpcData(apiClient.api.catalog.$get())),
    feed: input.seasonSlug ? null : await rpcData(apiClient.api.feed.$get({ query: { limit: "6" } })),
    viewerTimeZone: browserTimeZone(),
    renderedAt: new Date().toISOString(),
  }));

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
    const [{ readFeed }, { readCatalog }] = await Promise.all([
      import("~/repositories/feed"),
      import("~/repositories/catalog"),
    ]);
    const [feed, catalog] = await Promise.all([
      readFeed(database(input), { limit: 20 }),
      readCatalog(database(input)),
    ]);
    return { feed, catalog };
  })
  .client(async () => ({
    feed: await rpcData(apiClient.api.feed.$get({ query: { limit: "20" } })),
    catalog: await rpcData(apiClient.api.catalog.$get()),
  }));

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
