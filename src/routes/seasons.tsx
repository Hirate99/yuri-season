import { createFileRoute } from "@tanstack/react-router";
import { SeasonsPage } from "@/pages/seasons-page";
import { loadSeasonsData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";
import { seoHead } from "@/lib/seo";
import { seasonsDescription } from "@/lib/seo-descriptions";

export const Route = createFileRoute("/seasons")({
  staleTime: 900_000,
  loader: (loaderContext) =>
    loadSeasonsData({ serverContext: serverContextFromLoader(loaderContext) }),
  head: ({ loaderData }) =>
    seoHead({
      title: "季度片单",
      description: loaderData ? seasonsDescription(loaderData) : undefined,
      path: "/seasons",
    }),
  component: SeasonsRoute,
});

function SeasonsRoute() {
  return <SeasonsPage data={Route.useLoaderData()} />;
}
