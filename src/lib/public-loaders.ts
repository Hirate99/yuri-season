import { createIsomorphicFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import type { ClientResponse } from "hono/client";
import type { AnimePageResponse, AnimeRelatedResponse, PublicationDetailResponse } from "@/domain";
import type { ServerRequestContext } from "@/server-context";
import { apiClient, rpcData } from "./api";
import { feedClasses, feedQuery, type FeedSearch } from "./feed-search";

export type PublicLoadContext = { serverContext?: ServerRequestContext };

async function publicService(context: PublicLoadContext) {
  if (!context.serverContext) throw new Error("Server request context is unavailable.");
  const { createPublicService } = await import("~/application/public/service");
  return createPublicService(context.serverContext.env);
}

async function routeData<T extends ClientResponse<unknown>>(request: Promise<T>) {
  const response = await request;
  if (response.status === 404) throw notFound();
  return rpcData(response);
}

async function serverData<T>(request: Promise<T>): Promise<T> {
  try { return await request; }
  catch (error) {
    if (error instanceof Error && "status" in error && error.status === 404) throw notFound();
    throw error;
  }
}

export const loadHomeData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { seasonSlug?: string }) => {
    const service = await publicService(input);
    return serverData(service.home(input.serverContext?.viewerTimeZone ?? "Asia/Tokyo", input.seasonSlug));
  })
  .client((input: PublicLoadContext & { seasonSlug?: string }) => routeData(apiClient.api.home.$get({
    query: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo", season: input.seasonSlug },
  })));

export const loadCalendarData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { seasonSlug?: string }) => {
    const { calendar } = await publicService(input);
    return serverData(input.seasonSlug ? calendar.season(input.seasonSlug) : calendar.current());
  })
  .client((input: PublicLoadContext & { seasonSlug?: string }) => input.seasonSlug
    ? routeData(apiClient.api.seasons[":slug"].calendar.$get({ param: { slug: input.seasonSlug } }))
    : routeData(apiClient.api.calendar.$get()));

export const loadFeedData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { search?: FeedSearch }) => {
    const service = await publicService(input);
    const search = input.search ?? {};
    const [feed, animeOptions] = await Promise.all([
      service.feed({ limit: 20, query: search.q, animeSlug: search.anime, contentClasses: feedClasses(search) }),
      service.catalog.options(),
    ]);
    return { feed, animeOptions };
  })
  .client(async (input: PublicLoadContext & { search?: FeedSearch }) => {
    const [feed, animeOptions] = await Promise.all([
      routeData(apiClient.api.feed.$get({ query: feedQuery(input.search ?? {}) })),
      routeData(apiClient.api.catalog.options.$get()),
    ]);
    return { feed, animeOptions };
  });

export const loadAnimeData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { slug: string }): Promise<AnimePageResponse> => {
    const service = await publicService(input);
    const page = await service.anime.page(input.slug);
    if (!page) throw notFound();
    return page;
  })
  .client((input: PublicLoadContext & { slug: string }) =>
    routeData(apiClient.api.anime[":slug"].$get({ param: { slug: input.slug } })));

export const loadAnimeRelatedData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { slug: string }): Promise<AnimeRelatedResponse | null> => {
    const service = await publicService(input);
    return service.anime.related(input.slug);
  })
  .client((input: PublicLoadContext & { slug: string }) =>
    routeData(apiClient.api.anime[":slug"].related.$get({ param: { slug: input.slug } })));

export const loadPublicationData = createIsomorphicFn()
  .server(async (input: PublicLoadContext & { id: string }): Promise<PublicationDetailResponse> => {
    const service = await publicService(input);
    const page = await service.publications.page(input.id);
    if (!page) throw notFound();
    return page;
  })
  .client((input: PublicLoadContext & { id: string }) =>
    routeData(apiClient.api.updates[":id"].$get({ param: { id: input.id } })));

export const loadSeasonsData = createIsomorphicFn()
  .server(async (input: PublicLoadContext) => (await publicService(input)).seasons())
  .client(() => routeData(apiClient.api.seasons.$get()));
