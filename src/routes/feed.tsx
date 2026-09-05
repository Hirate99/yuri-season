import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { FeedPage } from "@/pages/feed-page";
import { loadFeedData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";
import { parseFeedSearch } from "@/lib/feed-search";

export const Route = createFileRoute("/feed")({
  staleTime: 30_000,
  validateSearch: parseFeedSearch,
  loaderDeps: ({ search }) => search,
  loader: (loaderContext) => loadFeedData({ serverContext: serverContextFromLoader(loaderContext), search: loaderContext.deps }),
  head: () => ({ meta: [{ title: "情报 · YuriSeason" }] }),
  component: FeedRoute,
});

function FeedRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const refreshing = useRouterState({ select: (state) => state.isLoading });
  return (
    <>
      <FeedPage initialPage={data.feed} animeOptions={data.animeOptions} search={search}
        refreshing={refreshing} onSearch={(next) => { void navigate({ search: next }); }} />
      <Outlet />
    </>
  );
}
