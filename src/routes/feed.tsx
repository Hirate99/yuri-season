import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "@/pages/feed-page";
import { loadFeedData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/feed")({
  loader: (loaderContext) => loadFeedData({ serverContext: serverContextFromLoader(loaderContext) }),
  component: FeedRoute,
});

function FeedRoute() {
  const data = Route.useLoaderData();
  return <FeedPage initialPage={data.feed} catalog={data.catalog} />;
}
