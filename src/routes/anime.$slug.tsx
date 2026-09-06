import { createFileRoute } from "@tanstack/react-router";
import { AnimePage } from "@/pages/anime-page";
import { loadAnimeData, loadAnimeRelatedData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";
import { seoHead } from "@/lib/seo";
import { animeDescription } from "@/lib/seo-descriptions";

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
  head: ({ loaderData, params }) =>
    seoHead({
      title: loaderData?.data.anime.titleZh ?? "作品",
      description: loaderData ? animeDescription(loaderData.data.anime) : undefined,
      path: `/anime/${encodeURIComponent(loaderData?.data.anime.slug ?? params.slug)}`,
      image: loaderData?.data.anime.coverUrl,
    }),
  component: AnimeRoute,
});

function AnimeRoute() {
  const { data, related } = Route.useLoaderData();

  return <AnimePage data={data} related={related} />;
}
