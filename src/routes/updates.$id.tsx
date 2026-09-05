import { createFileRoute, useCanGoBack, useRouter, useRouterState } from "@tanstack/react-router";

import { loadPublicationData } from "@/lib/public-loaders";
import { PublicationPage } from "@/pages/publication-page";
import { serverContextFromLoader } from "@/server-context";
import { publicationHead } from "@/lib/seo";

export const Route = createFileRoute("/updates/$id")({
  staleTime: 180_000,
  loader: (loaderContext) => loadPublicationData({
    serverContext: serverContextFromLoader(loaderContext),
    id: loaderContext.params.id,
  }),
  head: ({ loaderData, params }) => publicationHead(loaderData, params.id),
  component: PublicationRoute,
});

function PublicationRoute() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const returnToPrevious = useRouterState({
    select: (state) => state.location.state.yuriReturnToPrevious === true,
  });

  return (
    <PublicationPage
      data={Route.useLoaderData()}
      onBack={returnToPrevious && canGoBack ? () => router.history.back() : undefined}
      backLabel="返回上一页"
    />
  );
}
