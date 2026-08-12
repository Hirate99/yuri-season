import { createFileRoute } from "@tanstack/react-router";
import { SeasonPage } from "@/pages/season-page";
import { loadHomeData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/season/$slug")({
  loader: (loaderContext) => loadHomeData({
    serverContext: serverContextFromLoader(loaderContext),
    seasonSlug: loaderContext.params.slug,
  }),
  component: SeasonRoute,
});

function SeasonRoute() {
  const data = Route.useLoaderData();
  return <SeasonPage catalog={data.catalog} slug={Route.useParams().slug} />;
}
