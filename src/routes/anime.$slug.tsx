import { createFileRoute } from "@tanstack/react-router";
import { AnimePage } from "@/pages/anime-page";
import { loadAnimeData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/anime/$slug")({
  staleTime: 180_000,
  loader: (loaderContext) => loadAnimeData({
    serverContext: serverContextFromLoader(loaderContext),
    slug: loaderContext.params.slug,
  }),
  component: AnimeRoute,
});

function AnimeRoute() {
  return <AnimePage data={Route.useLoaderData()} />;
}
