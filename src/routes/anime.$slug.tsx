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
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.data.anime.titleZh ?? "作品"} · YuriSeason` },
    { name: "description", content: loaderData?.data.anime.synopsis ?? "作品资料与最新动态" },
  ] }),
  component: AnimeRoute,
});

function AnimeRoute() {
  const { data, related } = Route.useLoaderData();
  return <AnimePage data={data} related={related} />;
}
