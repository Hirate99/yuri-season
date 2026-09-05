import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { FeedPage } from "@/pages/feed-page";
import { loadFeedData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";
import { parseFeedSearch } from "@/lib/feed-search";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/feed")({
  staleTime: 30_000,
  validateSearch: parseFeedSearch,
  loaderDeps: ({ search }) => search,
  loader: (loaderContext) => loadFeedData({ serverContext: serverContextFromLoader(loaderContext), search: loaderContext.deps }),
  head: ({ matches, match }) => {
    // A nested publication supplies its own canonical URL and metadata.
    if (matches.some((entry) => String(entry.routeId) === "/feed/$id")) return {};
    return seoHead({
      title: "百合动画最新情报与官方动态",
      description: "百合动画情报时间线：追踪官方新消息、放送变更、宣传视觉图、声优与制作人员动态，也收录角色生日、同人精选和集中讨论。可按作品、内容类型或关键词查找，进入详情查看来源与已收录的原文、中文翻译和图片。",
      path: "/feed",
      noindex: Boolean(match.search.q || match.search.anime || match.search.category),
    });
  },
  component: FeedRoute,
});

function FeedRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const refreshing = useRouterState({ select: (state) => state.isLoading });
  return (
    <>
      <FeedPage initialPage={data.feed} animeOptions={data.animeOptions} search={search}
        refreshing={refreshing} onSearch={(next) => { void navigate({ search: next }); }} />
      <Outlet />
    </>
  );
}
