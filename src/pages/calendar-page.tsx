import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { page } from "@/lib/ui";

const days = [1, 2, 3, 4, 5, 6, 0];
const CALENDAR_TIME_ZONE = "Asia/Tokyo";

export function CalendarPage({ data, seasonSlug }: { data: CalendarResponse; seasonSlug?: string }) {
  const eventGroups = partitionCalendarEvents(data.events);
  const [renderPastEvents, setRenderPastEvents] = useState(Boolean(seasonSlug));
  const scheduleRef = useRef<HTMLElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const today = weekdayInTimeZone(CALENDAR_TIME_ZONE);

  useEffect(() => {
    const schedule = scheduleRef.current;
    const todayColumn = todayRef.current;
    if (!schedule || !todayColumn || !window.matchMedia("(max-width: 767px)").matches) return;

    const frame = window.requestAnimationFrame(() => {
      const scheduleRect = schedule.getBoundingClientRect();
      const todayRect = todayColumn.getBoundingClientRect();
      schedule.scrollLeft += todayRect.left - scheduleRect.left
        - (schedule.clientWidth - todayRect.width) / 2;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [today]);

  const eventRows = (events: CalendarResponse["events"]) => events.map((event) => (
    <CalendarEventCard event={event} key={event.id} />
  ));

  return (
    <div className={page}>
      <header className="py-7 md:py-9">
        <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-muted uppercase"><span className="size-1.5 rounded-full bg-signal-coral" />{data.season.label} · JST</p>
        <h1 className="mt-3 text-[38px] leading-none font-black tracking-[-0.045em] md:text-5xl">放送日历</h1>
      </header>

      <>
          <section ref={scheduleRef} className="-mx-3 mt-8 grid grid-cols-[repeat(7,180px)] gap-2 overflow-x-auto px-3 py-3 md:-mx-3" aria-label="每周放送表">
            {days.map((day) => {
              const entries = data.entries.filter((entry) => entry.slot.weekday === day);
              return (
                <div ref={day === today ? todayRef : undefined} className="min-h-84 rounded-[10px] bg-raised p-2" key={day} aria-current={day === today ? "date" : undefined}>
                  <header className="flex h-11 items-center justify-between px-2"><strong className="text-xs">{weekdayLabel(day)}</strong><small className="grid size-6 place-items-center rounded-full bg-white font-normal text-muted">{entries.length || "—"}</small></header>
                  <div className="grid gap-2">
                    {entries.map((entry) => (
                      <Link key={entry.slot.id} to="/anime/$slug" params={{ slug: entry.animeSlug }} className="grid grid-cols-[44px_1fr] gap-2.5 rounded-[7px] bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <CoverImage className="aspect-[3/4] w-11 rounded-md" src={bangumiCoverUrl(entry.coverUrl, 100)} alt={`${entry.titleZh} 封面`} />
                        <span className="min-w-0">
                          <BroadcastTime slot={entry.slot} />
                          <span className="mt-2 block text-xs leading-5 font-semibold">{entry.titleZh}</span>
                          <span className="mt-1.5 block"><EpisodeProgressBadge episode={entry.currentEpisode} /></span>
                          <small className="mt-1 block truncate text-[9px] text-muted">{entry.slot.label}</small>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="mt-14 max-w-[1080px]">
            <div className="mb-5"><h2 className="text-xl font-bold tracking-tight">事件</h2></div>
            <div className="grid gap-3">
              {eventRows(eventGroups?.upcoming ?? [])}
              {(eventGroups?.upcoming.length ?? 0) === 0 && <EmptyState title="暂无事件" detail="" />}
            </div>
            {(eventGroups?.past.length ?? 0) > 0 && (
              <details
                className="mt-5"
                open={Boolean(seasonSlug)}
                onToggle={(event) => {
                  if (event.currentTarget.open) setRenderPastEvents(true);
                }}
              >
                <summary className="cursor-pointer text-xs font-semibold text-muted">过去 {eventGroups?.past.length}</summary>
                {renderPastEvents && <div className="mt-3 grid gap-3">{eventRows(eventGroups?.past ?? [])}</div>}
              </details>
            )}
          </section>
      </>
    </div>
  );
}
