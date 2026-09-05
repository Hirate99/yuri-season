import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { loadPublicationData } from "@/lib/public-loaders";
import { PublicationPage } from "@/pages/publication-page";
import { serverContextFromLoader } from "@/server-context";
import { publicationHead } from "@/lib/seo";

export const Route = createFileRoute("/feed/$id")({
  staleTime: 180_000,
  loader: (loaderContext) => loadPublicationData({
    serverContext: serverContextFromLoader(loaderContext),
    id: loaderContext.params.id,
  }),
  head: ({ loaderData, params }) => publicationHead(loaderData, params.id),
  component: FeedPublicationRoute,
});

function FeedPublicationRoute() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    layerRef.current?.focus({ preventScroll: true });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.history.back();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [router]);

  return (
    <div
      ref={layerRef}
      className="scrollbar-hidden fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-white outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`情报详情：${data.item.title}`}
      tabIndex={-1}
    >
      <PublicationPage data={data} onBack={() => router.history.back()} />
    </div>
  );
}
