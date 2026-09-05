import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { FeedItem } from "@/domain";
import { contentLabel } from "@/lib/format";
import { LocalDateTime } from "./local-date-time";

function FeedTitle({ item, preserveFeedContext }: { item: FeedItem; preserveFeedContext: boolean }) {
  const props = {
    className: "after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent/50 group-hover:text-accent",
    children: item.title,
    "aria-label": `查看详情：${item.title}`,
  };
  if (item.contentClass === "community_thread") {
    return <a {...props} href={item.url} target="_blank" rel="noreferrer" aria-label={`打开讨论：${item.title}`} />;
  }
  return preserveFeedContext
    ? <Link {...props} to="/feed/$id" params={{ id: item.id }} search={(previous) => previous}
        mask={{ to: "/updates/$id", params: { id: item.id }, unmaskOnReload: true }} resetScroll={false} />
    : <Link {...props} to="/updates/$id" params={{ id: item.id }} state={{ yuriReturnToPrevious: true }} />;
}

export function FeedCard({ item, preserveFeedContext = false, compact = false }: {
  item: FeedItem; preserveFeedContext?: boolean; compact?: boolean;
}) {
  const relatedAnime = item.relatedAnime ?? [];
  const isCrossWork = item.contentClass === "community_thread" && relatedAnime.length > 1;
  const majorSpoiler = item.spoilerLevel === "major" || item.media?.spoilerLevel === "major";
  const showPreview = !majorSpoiler && Boolean(item.media?.previewUrl && item.media.presentationMode !== "link_only");

  return (
    <article className={`group surface relative shadow-[0_2px_6px_rgba(37,35,43,0.025),0_12px_28px_-16px_rgba(105,83,168,0.16)] transition-[border-color,box-shadow] duration-200 hover:border-accent/25 hover:shadow-[0_2px_8px_rgba(37,35,43,0.035),0_14px_32px_-16px_rgba(105,83,168,0.24)] ${compact ? "h-full p-4" : "p-4 md:p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-accent">{contentLabel(item.contentClass)}</span>
          {isCrossWork && <span>跨作品 · {relatedAnime.length} 部</span>}
          {(majorSpoiler || item.spoilerLevel !== "none") && <span>{majorSpoiler ? "重要剧透" : "含剧情信息"}</span>}
        </div>
        <LocalDateTime value={item.publishedAt} />
      </div>
      <div className={`mt-3 grid grid-rows-[min-content_1fr] items-start gap-x-3 gap-y-2 ${showPreview ? `grid-cols-[minmax(0,1fr)_72px] ${compact ? "" : "sm:grid-cols-[minmax(0,1fr)_128px] sm:gap-x-5"}` : "grid-cols-1"}`}>
        <h3 className={`col-start-1 row-start-1 min-w-0 text-[15px] leading-[22px] font-semibold ${compact ? "md:text-base md:leading-6" : "md:text-lg md:leading-7"}`}>
          <FeedTitle item={item} preserveFeedContext={preserveFeedContext} />
        </h3>
        {majorSpoiler ? <details className="relative z-10 col-start-1 row-start-2 text-sm leading-6 text-muted">
          <summary className="w-fit cursor-pointer text-accent">展开剧透摘要</summary>
          <p className="mt-2">{item.summary}</p>
        </details> : <p className={`row-start-2 line-clamp-2 text-muted ${showPreview ? "col-[1/3] sm:col-[1/2]" : "col-start-1"} ${compact ? "text-[13px] leading-[22px]" : "text-sm leading-6 md:leading-7"}`}>{item.summary}</p>}
        {showPreview && <div className="col-start-2 row-start-1 aspect-square overflow-hidden rounded-lg bg-raised sm:row-[1/3] md:aspect-[4/3]">
          <img className="h-full w-full object-cover" src={item.media?.previewUrl ?? ""} alt="" loading="lazy" referrerPolicy="no-referrer" />
        </div>}
      </div>
      <footer className="mt-3 flex items-center gap-3 text-xs text-muted">
        <a className="relative z-10 inline-flex min-h-7 min-w-0 max-w-[70%] items-center gap-1 hover:text-accent"
          href={item.url} target="_blank" rel="noreferrer" aria-label={`原文：${item.sourceName}`}
          title={item.sourceAccount ? `${item.sourceName} · ${item.sourceAccount}` : item.sourceName}>
          <span className="truncate">{item.sourceName}</span><ArrowUpRight className="shrink-0" size={12} />
        </a>
        {!isCrossWork && item.animeSlug && <Link className="relative z-10 inline-flex min-h-7 shrink-0 items-center text-muted hover:text-accent"
          to="/anime/$slug" params={{ slug: item.animeSlug }} aria-label={`作品：${item.animeTitle}`}>作品详情</Link>}
      </footer>
      {isCrossWork && <div className="mt-3 flex flex-wrap gap-1.5" aria-label="关联作品">
        {relatedAnime.slice(0, 4).map((work) => <Link className="relative z-10 max-w-full truncate rounded-md bg-raised px-2 py-1 text-xs text-muted hover:text-accent"
          key={work.id} to="/anime/$slug" params={{ slug: work.slug }}>{work.title}</Link>)}
        {relatedAnime.length > 4 && <span className="px-2 py-1 text-xs text-muted">+{relatedAnime.length - 4}</span>}
      </div>}
    </article>
  );
}
