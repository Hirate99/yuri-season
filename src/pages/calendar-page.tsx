import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { CalendarResponse } from "@/domain";
import { BroadcastTime } from "@/components/broadcast-time";
import { CoverImage } from "@/components/cover-image";
import { EmptyState } from "@/components/empty-state";
import { EpisodeProgressBadge } from "@/components/episode-progress-badge";
import { CalendarEventCard } from "@/features/calendar/calendar-event-card";
import { partitionCalendarEvents } from "@/lib/calendar-events";
import { weekdayLabel } from "@/lib/format";
import { bangumiCoverUrl } from "@/lib/media-url";
import { weekdayInTimeZone } from "@/lib/timezone";
import { cn, page } from "@/lib/ui";

const days = [1, 2, 3, 4, 5, 6, 0];

export function CalendarPage({ data, seasonSlug }: { data: CalendarResponse; seasonSlug?: string }) {
  const eventGroups = partitionCalendarEvents(data.events);
  const [renderPastEvents, setRenderPastEvents] = useState(Boolean(seasonSlug));
  const today = weekdayInTimeZone("Asia/Tokyo");
  const [selectedDay, setSelectedDay] = useState(today);

  return (
    <div className={page}>
      <header className="page-header">
        <h1 className="page-title">放送日历</h1>
        <p className="eyebrow justify-self-end whitespace-nowrap">{data.season.label} · JST</p>
      </header>
      <div>
        <nav className="sticky top-15 z-20 mb-4 grid grid-cols-7 gap-1 rounded-xl border border-line bg-white p-1 md:top-16 lg:hidden" aria-label="选择放送日">
          {days.map((day) => <button type="button" key={day} aria-pressed={day === selectedDay}
            onClick={() => setSelectedDay(day)}
            className={cn("rounded-lg py-3 text-sm", day === selectedDay ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-raised")}>
            {weekdayLabel(day)}
          </button>)}
        </nav>
        <section className="grid items-start gap-2 lg:grid-cols-7" aria-label="每周放送表">
          {days.map((day) => {
            const entries = data.entries.filter((entry) => entry.slot.weekday === day);
            return <div key={day} aria-current={day === today ? "date" : undefined}
              className={cn("min-w-0 lg:block lg:rounded-xl lg:border lg:p-2", day !== selectedDay && "hidden",
                day === today ? "lg:border-accent/25 lg:bg-accent-soft" : "lg:border-transparent lg:bg-raised")}>
              <header className="mb-2 flex items-baseline justify-between gap-2 px-1 text-sm lg:py-1.5">
                <strong className={day === today ? "text-accent" : ""}>{weekdayLabel(day)}{day === today && <span className="ml-1 text-xs font-normal">今天</span>}</strong>
                <span className="text-xs text-muted">{entries.length}</span>
              </header>
              <div className="grid gap-2">
                {entries.map((entry) => <Link key={entry.slot.id} to="/anime/$slug" params={{ slug: entry.animeSlug }}
                  className="group surface grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1 p-3 transition-colors hover:border-accent/30 lg:block lg:p-2.5">
                  <span className="col-start-2 row-start-1 lg:mb-2 lg:block [&_strong]:text-sm">
                    <BroadcastTime slot={entry.slot} />
                  </span>
                  <CoverImage className="col-start-1 row-span-2 row-start-1 aspect-[3/4] w-9 rounded lg:float-left lg:mr-2 lg:mb-1 lg:w-7" src={bangumiCoverUrl(entry.coverUrl, 100)} alt={`${entry.titleZh} 封面`} />
                  <strong className="col-start-2 row-start-2 min-w-0 text-[13px] leading-[18px] font-semibold group-hover:text-accent lg:block lg:text-xs">{entry.titleZh}</strong>
                  <span className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 lg:contents">
                    <span className="lg:mt-0.5 lg:block lg:[&>span]:text-[11px]"><EpisodeProgressBadge episode={entry.currentEpisode} /></span>
                    <small className="text-xs leading-4 text-muted lg:clear-both lg:block lg:pt-1.5 lg:text-[11px]">{entry.slot.label}</small>
                  </span>
                </Link>)}
                {!entries.length && <p className="px-1 py-4 text-xs text-muted">暂无放送</p>}
              </div>
            </div>;
          })}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-5 text-2xl font-bold">事件</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {eventGroups.upcoming.map((event) => <CalendarEventCard event={event} key={event.id} />)}
          {!eventGroups.upcoming.length && <EmptyState title="暂无事件" />}
        </div>
        {eventGroups.past.length > 0 && <details className="mt-5" open={Boolean(seasonSlug)}
          onToggle={(event) => { if (event.currentTarget.open) setRenderPastEvents(true); }}>
          <summary className="cursor-pointer text-sm font-semibold text-muted">过去的事件 · {eventGroups.past.length}</summary>
          {renderPastEvents && <div className="mt-3 grid gap-3 md:grid-cols-2">{eventGroups.past.map((event) => <CalendarEventCard event={event} key={event.id} />)}</div>}
        </details>}
      </section>
    </div>
  );
}
