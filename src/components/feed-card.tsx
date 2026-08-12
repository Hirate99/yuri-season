import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { FeedItem } from "@/domain";
import { contentLabel } from "@/lib/format";
import { CoverImage } from "./cover-image";
import { LocalDateTime } from "./local-date-time";

export function FeedCard({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const showPreview = Boolean(item.media?.previewUrl && item.media.presentationMode !== "link_only");
  const showCover = !showPreview && Boolean(item.animeCoverUrl);

  return (
    <article className="rounded-[10px] border border-black/[0.06] bg-white p-4 shadow-[0_10px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.085)] md:p-5">
      <div className="flex items-center justify-between gap-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 font-semibold text-ink"><i className="size-1 rounded-full bg-charcoal" aria-hidden="true" />{contentLabel(item.contentClass)}</span>
        <LocalDateTime value={item.publishedAt} />
      </div>
      <div className={showPreview || showCover ? "mt-4 grid grid-cols-[minmax(0,1fr)_68px] gap-4 sm:grid-cols-[minmax(0,1fr)_116px]" : "mt-4 min-w-0"}>
        <div className="min-w-0">
          <h3 className={compact ? "text-sm font-semibold" : "text-base font-semibold"}>
            <a className="inline-flex items-start gap-1" href={item.url} target="_blank" rel="noreferrer">{item.title}<ArrowUpRight className="mt-0.5 shrink-0" size={14} /></a>
          </h3>
          <p className="mt-2 text-xs leading-6 text-[#50545b]">{item.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
            <span>{item.sourceName}{item.sourceAccount ? ` · ${item.sourceAccount}` : ""}</span>
            {item.animeSlug && <Link className="text-ink hover:underline" to="/anime/$slug" params={{ slug: item.animeSlug }}>{item.animeTitle}</Link>}
          </div>
        </div>
        {showPreview ? (
          <a className="aspect-[4/3] overflow-hidden rounded-xl bg-[#eceef1]" href={item.media?.originalUrl} target="_blank" rel="noreferrer">
            <img className="h-full w-full object-cover" src={item.media?.previewUrl ?? ""} alt="" loading="lazy" referrerPolicy="no-referrer" />
          </a>
        ) : showCover ? (
          item.animeSlug ? (
            <Link to="/anime/$slug" params={{ slug: item.animeSlug }}>
              <CoverImage className="aspect-[3/4] w-full rounded-xl shadow-sm" src={item.animeCoverUrl} alt={`${item.animeTitle ?? "作品"} 封面`} />
            </Link>
          ) : <CoverImage className="aspect-[3/4] w-full rounded-xl shadow-sm" src={item.animeCoverUrl} alt="作品封面" />
        ) : null}
      </div>
    </article>
  );
}
