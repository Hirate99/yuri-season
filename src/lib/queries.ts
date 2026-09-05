import { infiniteQueryOptions, QueryClient } from "@tanstack/react-query";
import { feedQuery, type FeedSearch } from "./feed-search";
import { loadFeedPage, type PublicLoadContext } from "./public-loaders";

export function createQueryClient() {
  return new QueryClient({ defaultOptions: {
    queries: { staleTime: 60_000, retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  } });
}

export const feedOptions = (search: FeedSearch, context: PublicLoadContext = {}) => infiniteQueryOptions({
  queryKey: ["feed", feedQuery(search)],
  queryFn: ({ pageParam, signal }) => loadFeedPage({ ...context, search, cursor: pageParam, signal }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (page) => page.nextCursor ?? undefined,
  staleTime: 30_000,
});
