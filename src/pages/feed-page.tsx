import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AnimeOption } from "@/domain";
import { EmptyState } from "@/components/empty-state";
import { FeedCard } from "@/components/feed-card";
import { AnimeCombobox } from "@/components/anime-combobox";
import { VirtualWindowGrid } from "@/components/virtual-window-grid";
import { useInfiniteQuery } from "@tanstack/react-query";
import { feedOptions } from "@/lib/queries";
import { feedFilters, feedQuery, type FeedSearch } from "@/lib/feed-search";
import { cn, page, textButton } from "@/lib/ui";

export function FeedPage({ animeOptions, search, refreshing, onSearch }: {
  animeOptions: AnimeOption[];
  search: FeedSearch;
  refreshing: boolean;
  onSearch: (search: FeedSearch) => void;
}) {
  const [query, setQuery] = useState(search.q ?? "");
  useEffect(() => setQuery(search.q ?? ""), [search.q]);
  const request = feedQuery(search);

  return (
    <div className={page}>
      <header className="page-header">
        <h1 className="page-title">情报</h1>
        <form className="flex h-10 w-full max-w-64 items-center gap-2 justify-self-end rounded-lg bg-raised pl-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-accent-soft"
          onSubmit={(event) => { event.preventDefault(); onSearch({ ...search, q: query.trim() || undefined }); }}>
          <input className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted md:text-sm"
            value={query} onChange={(event) => {
              setQuery(event.target.value);
              if (!event.target.value) onSearch({ ...search, q: undefined });
            }}
            placeholder="搜索情报" aria-label="搜索情报" type="search" maxLength={120}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" />
          <button className="grid size-10 shrink-0 place-items-center text-accent" type="submit" aria-label="搜索"><Search size={18} /></button>
        </form>
      </header>

      <section className="min-w-0" aria-label="情报列表" aria-busy={refreshing}>
        <div className="sticky top-15 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-white pb-2 md:top-16 md:grid-cols-[1fr_180px] md:py-2">
          <div className="scrollbar-hidden flex min-w-0 gap-1 overflow-x-auto md:w-fit" aria-label="筛选动态">
            {feedFilters.map((filter) => (
              <button key={filter.value} type="button"
                aria-pressed={(search.category ?? "all") === filter.value}
                className={cn("rounded-lg px-2 py-2 text-[13px] whitespace-nowrap transition-colors md:px-3 md:text-sm",
                  (search.category ?? "all") === filter.value ? "bg-accent-soft/70 font-semibold text-accent" : "text-muted hover:text-ink")}
                onClick={() => onSearch({ ...search, category: filter.value === "all" ? undefined : filter.value })}
              >{filter.label}</button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="w-10 min-w-0 md:w-full"><AnimeCombobox compact anime={animeOptions} value={search.anime ?? ""}
              onChange={(anime) => onSearch({ ...search, anime: anime || undefined })} /></div>
            {(search.anime || search.q || search.category) && <button className="shrink-0 text-xs font-semibold text-accent" onClick={() => onSearch({})}>重置</button>}
          </div>
        </div>
        {search.anime && <p className="mt-1 mb-2 text-xs text-accent">作品：{animeOptions.find((anime) => anime.slug === search.anime)?.titleZh ?? search.anime}</p>}
        <FeedResults key={JSON.stringify(request)} search={search} refreshing={refreshing} />
      </section>
    </div>
  );
}

function FeedResults({ search, refreshing }: {
  search: FeedSearch;
  refreshing: boolean;
}) {
  const feed = useInfiniteQuery(feedOptions(search));
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (feed.data?.pages.flatMap(page => page.items) ?? []).filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [feed.data]);
  const loadMore = () => { if (feed.hasNextPage && !feed.isFetching) void feed.fetchNextPage(); };

  return <>
    <div className="h-1" role="status">
      <span className="sr-only">{refreshing ? "加载中" : ""}</span>
    </div>
    <VirtualWindowGrid items={items} getKey={(item) => item.id} wideLanes={2}
      renderItem={(item) => <FeedCard item={item} preserveFeedContext />}
      estimateRowSize={190} hasMore={!refreshing && !feed.error && feed.hasNextPage}
      loadingMore={feed.isFetchingNextPage} onLoadMore={loadMore} />
    {items.length === 0 && <EmptyState title="暂无匹配的情报" />}
    {feed.error && <div className="mt-4 space-y-3"><EmptyState title="加载失败" detail={feed.error.message} />
      <button className={textButton} type="button" onClick={() => {
        if (feed.isFetchNextPageError) loadMore(); else void feed.refetch();
      }}>重试</button></div>}
  </>;
}
