import { ArrowUpRight } from "lucide-react";
import type { Discussion, FeedItem, MediaItem } from "@/domain";
import { EmptyState } from "@/components/empty-state";
import { FeedCard } from "@/components/feed-card";
import { SectionHeading } from "@/components/section-heading";
import { shortDate } from "@/lib/format";

export function UpdatesSection({ items }: { items: FeedItem[] }) {
  return (
    <section>
      <SectionHeading title="相关动态" />
      {items.length > 0 ? <div className="grid gap-2">{items.map((item) => <FeedCard key={item.id} item={item} compact />)}</div> : <EmptyState title="暂无动态" detail="" />}
    </section>
  );
}

export function MediaSection({ media }: { media: MediaItem[] }) {
  if (media.length === 0) return null;
  return (
    <section>
      <SectionHeading title="贺图 / 同人" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3">
        {media.map((item) => (
          <a key={item.id} href={item.originalUrl} target="_blank" rel="noreferrer" className="group min-w-0">
            {item.previewUrl && item.presentationMode !== "link_only" ? (
              <span className="block aspect-square overflow-hidden rounded-2xl bg-[#eceef1] shadow-md"><img className="h-full w-full object-cover transition group-hover:scale-[1.01]" src={item.previewUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /></span>
            ) : (
              <span className="grid aspect-square place-items-center rounded-2xl border border-black/[0.06] bg-raised px-4 text-center text-xs text-muted">查看原图</span>
            )}
            <h3 className="mt-2 text-xs font-semibold leading-5">{item.title}</h3>
            <p className="mt-1 text-[10px] text-muted">{item.creatorName} · {shortDate(item.publishedAt)}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export function DiscussionsSection({ discussions }: { discussions: Discussion[] }) {
  if (discussions.length === 0) return null;
  return (
    <section className="rounded-[10px] bg-charcoal p-5 text-white shadow-[0_24px_55px_rgba(15,23,42,0.18)] md:p-6">
      <div className="flex items-end justify-between gap-4"><h2 className="text-lg font-bold md:text-xl">集中讨论</h2><span className="text-[10px] text-white/45">{discussions.length} 个入口</span></div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {discussions.map((thread) => (
          <a className="grid min-h-22 grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[7px] border border-white/10 bg-white/8 p-4 text-xs backdrop-blur-xl transition hover:bg-white/13" key={thread.id} href={thread.url} target="_blank" rel="noreferrer">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/60">{thread.platform}</span>
            <span><strong className="font-semibold">{thread.title}</strong>{thread.note && <small className="mt-1 block text-[10px] text-white/50">{thread.note}</small>}</span>
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
    </section>
  );
}
