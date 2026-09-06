import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Discussion, FeedItem, MediaItem } from "@/domain";
import { EmptyState } from "@/components/empty-state";
import { FeedCard } from "@/components/feed-card";
import { SectionHeading } from "@/components/section-heading";
import { shortDate } from "@/lib/format";

export function UpdatesSection({ items, animeSlug }: { items: FeedItem[]; animeSlug: string }) {
  return (
    <section id="updates">
      <SectionHeading
        title="相关动态"
        action={
          <Link
            className="text-sm font-semibold text-accent"
            to="/feed"
            search={{ anime: animeSlug }}
          >
            全部动态 →
          </Link>
        }
      />
      {items.length > 0 ? (
        <div className="grid gap-2">
          {items.slice(0, 2).map((item) => (
            <FeedCard key={item.id} item={item} compact />
          ))}
        </div>
      ) : (
        <EmptyState title="暂无动态" detail="" />
      )}
    </section>
  );
}

export function MediaSection({ media }: { media: MediaItem[] }) {
  if (media.length === 0) return null;

  return (
    <section>
      <SectionHeading title="相关创作" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3">
        {media.map((item) => (
          <a
            key={item.id}
            href={item.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="group min-w-0"
          >
            {item.previewUrl &&
            item.presentationMode !== "link_only" &&
            item.spoilerLevel !== "major" ? (
              <span className="block aspect-square overflow-hidden rounded-2xl bg-[#eceef1] shadow-md">
                <img
                  className="h-full w-full object-cover transition group-hover:scale-[1.01]"
                  src={item.previewUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </span>
            ) : (
              <span className="grid aspect-square place-items-center rounded-2xl border border-black/[0.06] bg-raised px-4 text-center text-xs text-muted">
                查看原图
              </span>
            )}
            <h3 className="mt-2 text-xs font-semibold leading-5">{item.title}</h3>
            <p className="mt-1 text-[10px] text-muted">
              {item.creatorName} · {shortDate(item.publishedAt)}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

export function DiscussionsSection({ discussions }: { discussions: Discussion[] }) {
  if (discussions.length === 0) return null;

  return (
    <section id="discussions">
      <SectionHeading title="站外讨论" />
      <div className="grid gap-3 md:grid-cols-2">
        {discussions.map((thread) => (
          <a
            className="surface grid grid-cols-[1fr_auto] items-center gap-3 p-4 text-sm transition hover:border-accent/30 hover:text-accent"
            key={thread.id}
            href={thread.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              <span className="mb-1 block text-xs text-muted">{thread.platform}</span>
              <strong className="font-medium">{thread.title}</strong>
              {thread.note && (
                <small className="mt-1 block text-xs text-muted">{thread.note}</small>
              )}
            </span>
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
    </section>
  );
}
