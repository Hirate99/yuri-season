import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/home-page";
import { loadHomeData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";
import { seoHead, SITE_NAME, SITE_ORIGIN } from "@/lib/seo";
import { catalogDescription } from "@/lib/seo-descriptions";

export const Route = createFileRoute("/")({
  staleTime: 120_000,
  loader: (loaderContext) =>
    loadHomeData({ serverContext: serverContextFromLoader(loaderContext) }),
  head: ({ loaderData }) => {
    const head = seoHead({
      title: SITE_NAME,
      description: loaderData ? catalogDescription(loaderData.catalog, true) : undefined,
      path: "/",
    });

    return {
      ...head,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_ORIGIN,
            inLanguage: "zh-CN",
          }),
        },
      ],
    };
  },
  component: HomeRoute,
});

function HomeRoute() {
  const data = Route.useLoaderData();

  return (
    <HomePage
      catalog={data.catalog}
      feed={data.feed}
      viewerTimeZone={data.viewerTimeZone}
      renderedAt={data.renderedAt}
    />
  );
}
