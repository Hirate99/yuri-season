import { createFileRoute, Outlet } from "@tanstack/react-router";
import { FeedPage } from "@/pages/feed-page";
import { loadFeedData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/feed")({
  staleTime: 30_000,
  loader: (loaderContext) => loadFeedData({ serverContext: serverContextFromLoader(loaderContext) }),
  component: FeedRoute,
});

function FeedRoute() {
  const data = Route.useLoaderData();
  return (
    <>
      <FeedPage initialPage={data.feed} animeOptions={data.animeOptions} />
      <Outlet />
    </>
  );
}
