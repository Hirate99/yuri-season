import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/home-page";
import { loadHomeData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/")({
  staleTime: 120_000,
  loader: (loaderContext) => loadHomeData({ serverContext: serverContextFromLoader(loaderContext) }),
  component: HomeRoute,
});

function HomeRoute() {
  const data = Route.useLoaderData();
  return (
    <HomePage
      catalog={data.catalog}
      feed={data.feed}
      viewerTimeZone={data.viewerTimeZone}
      renderedAt={data.renderedAt}
    />
  );
}
