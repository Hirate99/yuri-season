import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CatalogResponse, ContentClass, FeedResponse } from "@/domain";
import { EmptyState, LoadingRows } from "@/components/empty-state";
import { FeedCard } from "@/components/feed-card";
import { AnimeCombobox } from "@/components/anime-combobox";
import { VirtualWindowGrid } from "@/components/virtual-window-grid";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCursorFeed } from "@/hooks/use-cursor-feed";
import { cn, page } from "@/lib/ui";

const filters: Array<{ label: string; value: string; classes: ContentClass[] }> = [
  { label: "全部", value: "all", classes: [] },
  { label: "公式", value: "official", classes: ["schedule", "official_news", "official_art"] },
  { label: "作者 / Staff", value: "creators", classes: ["creator_art", "staff_post"] },
  { label: "声优", value: "cast", classes: ["cast_post"] },
  { label: "生日", value: "birthday", classes: ["birthday"] },
  { label: "同人", value: "fanwork", classes: ["fanwork"] },
  { label: "讨论", value: "community", classes: ["community_thread"] },
];

function FeedSearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted md:text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="作品、人物、来源或关键词"
      type="search"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="search"
    />
  );
}

export function FeedPage({ initialPage, catalog }: { initialPage: FeedResponse; catalog: CatalogResponse }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [animeSlug, setAnimeSlug] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const feedQuery = useMemo(() => {
    const selectedFilter = filters.find((item) => item.value === filter);
    return {
      limit: "20",
      q: debouncedQuery.trim() || undefined,
      anime: animeSlug || undefined,
      classes: selectedFilter?.classes.length ? selectedFilter.classes.join(",") : undefined,
    };
  }, [animeSlug, debouncedQuery, filter]);
  const feed = useCursorFeed(feedQuery, initialPage);

  return (
    <div className={page}>
      <header className="grid gap-6 py-7 md:grid-cols-[1fr_minmax(320px,520px)] md:items-end md:py-9">
        <div><p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-muted uppercase"><span className="size-1.5 rounded-full bg-signal-coral" />2026 夏 · Latest</p><h1 className="mt-3 text-[38px] leading-none font-black tracking-[-0.045em] md:text-5xl">情报</h1></div>
        <label className="relative z-10 hidden h-12 items-center gap-3 border border-black/[0.06] bg-white/75 px-4 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur-2xl focus-within:ring-2 focus-within:ring-charcoal/20 md:flex">
          <Search size={17} className="text-muted" />
          <FeedSearchInput value={query} onChange={setQuery} />
        </label>
      </header>

      <div className="sticky top-[60px] z-20 -mx-2 mt-5 rounded-2xl border border-black/[0.05] bg-white/85 p-2 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-2xl md:top-[64px]">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="flex gap-1.5 overflow-x-auto" aria-label="筛选动态">
            {filters.map((item) => (
              <button
                key={item.value}
                className={cn(
                  "whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                  filter === item.value
                    ? "bg-charcoal text-white"
                    : "text-muted hover:bg-raised hover:text-ink",
                )}
                onClick={() => setFilter(item.value)}
              >{item.label}</button>
            ))}
          </div>
          <AnimeCombobox anime={catalog.anime} value={animeSlug} onChange={setAnimeSlug} />
        </div>
      </div>

      {feed.loading && <LoadingRows count={6} />}
      {feed.error && feed.items.length === 0 && <EmptyState title="情报加载失败" detail={feed.error} />}
      {feed.items.length > 0 && <p className="mt-6 text-[10px] text-muted">已载入 {feed.items.length} 条</p>}
      <VirtualWindowGrid
        items={feed.items}
        getKey={(item) => item.id}
        renderItem={(item) => <FeedCard item={item} />}
        hasMore={Boolean(feed.nextCursor)}
        loadingMore={feed.loadingMore}
        onLoadMore={feed.loadMore}
        wideLanes={2}
      />
      {!feed.loading && feed.items.length === 0 && !feed.error && <EmptyState title="暂无内容" detail="" />}
      {feed.error && feed.items.length > 0 && <EmptyState title="继续加载失败" detail={feed.error} />}
    </div>
  );
}
