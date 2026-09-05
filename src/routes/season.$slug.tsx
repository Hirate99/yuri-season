import { createFileRoute } from "@tanstack/react-router";
import { SeasonPage } from "@/pages/season-page";
import { loadHomeData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";
import { seoHead } from "@/lib/seo";
import { catalogDescription, seasonName } from "@/lib/seo-descriptions";

export const Route = createFileRoute("/season/$slug")({
  staleTime: 300_000,
  loader: (loaderContext) => loadHomeData({
    serverContext: serverContextFromLoader(loaderContext),
    seasonSlug: loaderContext.params.slug,
  }),
  head: ({ loaderData, params }) => seoHead({
    title: `${seasonName(loaderData?.catalog.season.label ?? "季度")}百合动画片单`,
    description: loaderData ? catalogDescription(loaderData.catalog) : undefined,
    path: `/season/${encodeURIComponent(params.slug)}`,
  }),
  component: SeasonRoute,
});

function SeasonRoute() {
  const data = Route.useLoaderData();
  return <SeasonPage catalog={data.catalog} slug={Route.useParams().slug} />;
}
