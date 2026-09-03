import { createFileRoute } from "@tanstack/react-router";
import { AnimePage } from "@/pages/anime-page";
import { loadAnimeData, loadAnimeRelatedData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/anime/$slug")({
  staleTime: 180_000,
  loader: async (loaderContext) => {
    const input = {
      serverContext: serverContextFromLoader(loaderContext),
      slug: loaderContext.params.slug,
    };
    const related = loadAnimeRelatedData(input).catch(() => null);
    return { data: await loadAnimeData(input), related };
  },
  component: AnimeRoute,
});

function AnimeRoute() {
  const { data, related } = Route.useLoaderData();
  return <AnimePage data={data} related={related} />;
}
