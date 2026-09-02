import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { FeedItem } from "@/domain";
import { contentLabel } from "@/lib/format";
import { bangumiCoverUrl } from "@/lib/media-url";
import { CoverImage } from "./cover-image";
import { LocalDateTime } from "./local-date-time";

export function FeedCard({ item, compact = false, preserveFeedContext = false }: {
  item: FeedItem;
  compact?: boolean;
  preserveFeedContext?: boolean;
}) {
  const relatedAnime = item.relatedAnime ?? [];
  const isDiscussion = item.contentClass === "community_thread";
  const isCrossWork = item.contentClass === "community_thread" && relatedAnime.length > 1;
  const showPreview = Boolean(item.media?.previewUrl && item.media.presentationMode !== "link_only");
  const showCover = !showPreview && !isCrossWork && Boolean(item.animeCoverUrl);

  return (
    <article className="group relative rounded-[10px] border border-black/[0.06] bg-white p-4 shadow-[0_10px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.085)] md:p-5">
      <div className="flex items-center justify-between gap-3 text-[10px] text-muted">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 font-semibold text-ink"><i className="size-1 rounded-full bg-charcoal" aria-hidden="true" />{contentLabel(item.contentClass)}</span>
          {isCrossWork && <span className="rounded-full bg-[#eeeafd] px-2.5 py-1 font-semibold text-[#51459d]">跨作品 · {relatedAnime.length} 部</span>}
        </div>
        <LocalDateTime value={item.publishedAt} />
      </div>
      <div className={showPreview || showCover ? "mt-4 grid grid-cols-[minmax(0,1fr)_68px] gap-4 sm:grid-cols-[minmax(0,1fr)_116px]" : "mt-4 min-w-0"}>
        <div className="min-w-0">
          <h3 className={compact ? "text-sm font-semibold" : "text-base font-semibold"}>
            {isDiscussion ? (
              <a
                className="after:absolute after:inset-0 after:rounded-[10px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-charcoal/50 group-hover:underline"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`打开讨论：${item.title}`}
              >{item.title}</a>
            ) : preserveFeedContext ? (
              <Link
                className="after:absolute after:inset-0 after:rounded-[10px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-charcoal/50 group-hover:underline"
                to="/feed/$id"
                params={{ id: item.id }}
                mask={{ to: "/updates/$id", params: { id: item.id }, unmaskOnReload: true }}
                resetScroll={false}
                aria-label={`查看详情：${item.title}`}
              >{item.title}</Link>
            ) : (
              <Link
                className="after:absolute after:inset-0 after:rounded-[10px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-charcoal/50 group-hover:underline"
                to="/updates/$id"
                params={{ id: item.id }}
                state={{ yuriReturnToPrevious: true }}
                aria-label={`查看详情：${item.title}`}
              >{item.title}</Link>
            )}
          </h3>
          <p className="mt-2 text-xs leading-6 text-[#50545b]">{item.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
            <span>{item.sourceName}{item.sourceAccount ? ` · ${item.sourceAccount}` : ""}</span>
            {!isCrossWork && item.animeSlug && <Link className="relative z-10 text-ink hover:underline" to="/anime/$slug" params={{ slug: item.animeSlug }}>{item.animeTitle}</Link>}
            <a className="relative z-10 inline-flex items-center gap-0.5 text-ink hover:underline" href={item.url} target="_blank" rel="noreferrer">{isDiscussion ? "讨论串" : "原文"}<ArrowUpRight size={11} /></a>
          </div>
          {isCrossWork && (
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="关联作品">
              {relatedAnime.slice(0, 4).map((work) => <a className="relative z-10 max-w-full truncate rounded-full border border-black/[0.07] bg-raised px-2.5 py-1 text-[10px] font-medium text-ink hover:bg-[#eeeafd]" key={work.id} href={`/anime/${work.slug}`}>{work.title}</a>)}
              {relatedAnime.length > 4 && <span className="rounded-full bg-raised px-2.5 py-1 text-[10px] text-muted">+{relatedAnime.length - 4}</span>}
            </div>
          )}
        </div>
        {showPreview ? (
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#eceef1]">
            <img className="h-full w-full object-cover" src={item.media?.previewUrl ?? ""} alt="" loading="lazy" referrerPolicy="no-referrer" />
          </div>
        ) : showCover ? (
          <div>
            <CoverImage className="aspect-[3/4] w-full rounded-xl shadow-sm" src={bangumiCoverUrl(item.animeCoverUrl, 200)} alt={`${item.animeTitle ?? "作品"} 封面`} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
