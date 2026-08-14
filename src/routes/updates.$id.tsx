import { createFileRoute } from "@tanstack/react-router";

import { loadPublicationData } from "@/lib/public-loaders";
import { PublicationPage } from "@/pages/publication-page";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/updates/$id")({
  loader: (loaderContext) => loadPublicationData({
    serverContext: serverContextFromLoader(loaderContext),
    id: loaderContext.params.id,
  }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.item.title ?? "情报"} · YuriSeason` },
      { name: "description", content: loaderData?.item.summary ?? "YuriSeason 情报详情" },
    ],
  }),
  component: PublicationRoute,
});

function PublicationRoute() {
  return <PublicationPage data={Route.useLoaderData()} />;
}
