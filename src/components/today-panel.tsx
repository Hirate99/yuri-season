import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CatalogResponse } from "@/domain";
import { eventOccursToday } from "@/lib/calendar-events";
import { verifiedBirthdayPortrait } from "@/lib/character-portraits";
import { eventPresentation, eventTitle } from "@/lib/event-presentation";
import { partitionByAiringToday } from "@/lib/home-ordering";
import { bangumiCoverUrl } from "@/lib/media-url";
import { BroadcastTime } from "./broadcast-time";
import { CoverImage } from "./cover-image";
import { EventTime } from "./event-time";

const card = "flex min-w-0 items-start gap-2.5 rounded-lg border border-line bg-white p-3 shadow-[0_2px_6px_rgba(37,35,43,0.03)] transition-colors hover:border-accent/30";
const label = "mb-1.5 inline-flex rounded bg-accent-soft/70 px-1.5 py-0.5 text-xs font-medium text-accent";

export function TodayPanel({ catalog, viewerTimeZone, renderedAt }: {
  catalog: CatalogResponse; viewerTimeZone: string; renderedAt: string;
}) {
  const now = new Date(renderedAt);
  const { airingToday } = partitionByAiringToday(catalog.anime, viewerTimeZone, now);
  const events = catalog.events.filter((event) => eventOccursToday(event, viewerTimeZone, now));
  const today = new Intl.DateTimeFormat("zh-CN", { timeZone: viewerTimeZone, month: "long", day: "numeric", weekday: "long" }).format(now);

  return (
    <section className="mt-4 rounded-2xl bg-accent-soft/55 p-4 md:p-6" aria-labelledby="today-title">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="today-title" className="flex items-center gap-2 text-lg font-semibold"><span className="size-2 rounded-full bg-accent" />今天</h2>
          <p className="text-xs text-muted">{today}</p>
        </div>
        <Link to="/calendar" className="inline-flex shrink-0 items-center gap-1 py-1 text-xs font-medium text-accent hover:underline">日历<ArrowRight size={14} /></Link>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,250px)]">
        {airingToday.map((anime) => <Link key={anime.id} to="/anime/$slug" params={{ slug: anime.slug }} className={card}>
          <CoverImage className="aspect-[3/4] w-10 shrink-0 rounded" src={bangumiCoverUrl(anime.coverUrl, 100)} alt={`${anime.titleZh} 封面`} />
          <div className="min-w-0">
            <span className={label}>放送</span>
            <h3 className="text-[13px] leading-5 font-semibold">{anime.titleZh}</h3>
            {anime.primarySlot && <div className="mt-1.5"><BroadcastTime slot={anime.primarySlot} viewerTimeZone={viewerTimeZone} now={now} /></div>}
          </div>
        </Link>)}
        {events.map((event) => {
          const portrait = verifiedBirthdayPortrait(event);
          const content = <>
            <div className="min-w-0 flex-1">
              <span className={label}>{eventPresentation(event.eventType).label}</span>
              <h3 className="text-[13px] leading-5 font-semibold">{eventTitle(event)}</h3>
              <div className="mt-1.5"><EventTime event={event} viewerTimeZone={viewerTimeZone} showTime /></div>
            </div>
            {portrait && <CoverImage className="size-10 shrink-0 self-center rounded-full" src={portrait.imageUrl} alt={`${event.characterName ?? "角色"}头像`} />}
          </>;
          return event.sourceUrl
            ? <a key={event.id} href={event.sourceUrl} target="_blank" rel="noreferrer" className={card}>{content}</a>
            : <div key={event.id} className={card}>{content}</div>;
        })}
      </div>
      {!airingToday.length && !events.length && <p className="py-2 text-sm text-muted">今天暂无放送或活动。</p>}
    </section>
  );
}
