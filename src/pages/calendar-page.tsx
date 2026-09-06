import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { CalendarResponse } from "@/domain";
import { BroadcastTime } from "@/components/broadcast-time";
import { CoverImage } from "@/components/cover-image";
import { EmptyState } from "@/components/empty-state";
import { EpisodeProgressBadge } from "@/components/episode-progress-badge";
import { CalendarEventCard } from "@/features/calendar/calendar-event-card";
import { eventOccursToday, partitionCalendarEvents, prioritizeCalendarEvents } from "@/lib/calendar-events";
import { eventTitle } from "@/lib/event-presentation";
import { weekdayLabel } from "@/lib/format";
import { bangumiCoverUrl } from "@/lib/media-url";
import { weekdayInTimeZone } from "@/lib/timezone";
import { cn, page } from "@/lib/ui";

const days = [1, 2, 3, 4, 5, 6, 0];
const calendarTimeZone = "Asia/Tokyo";

export function CalendarPage({ data, seasonSlug }: { data: CalendarResponse; seasonSlug?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const todayEvents = prioritizeCalendarEvents(
    data.events.filter((event) => eventOccursToday(event, calendarTimeZone, now)), calendarTimeZone, now,
  );
  const todayIds = new Set(todayEvents.map((event) => event.id));
  const birthdayNames = todayEvents.filter((event) => event.eventType === "birthday")
    .map((event) => event.characterName ?? eventTitle(event));
  const eventGroups = partitionCalendarEvents(data.events.filter((event) => !todayIds.has(event.id)), now);
  const [renderPastEvents, setRenderPastEvents] = useState(Boolean(seasonSlug));
  const today = weekdayInTimeZone(calendarTimeZone, now);
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
        {todayEvents.length > 0 && <section className="rounded-2xl border border-accent/15 bg-accent-soft/40 p-4 md:p-6" aria-labelledby="today-events-title">
          <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="today-events-title" className="text-lg font-semibold">今天的事件 <span className="ml-1 text-xs font-normal text-muted">{todayEvents.length}</span></h3>
            <p className="text-xs text-muted">{new Intl.DateTimeFormat("zh-CN", { timeZone: calendarTimeZone, month: "long", day: "numeric" }).format(now)} · JST</p>
          </header>
          {birthdayNames.length > 0 && <div className="relative mb-4 overflow-hidden rounded-xl border border-rose-200/60 bg-gradient-to-r from-rose-50 via-white to-amber-50 px-5 py-5 md:px-6" role="note" aria-label="今日生日祝福">
            <span aria-hidden="true" className="pointer-events-none absolute top-2 right-4 text-5xl text-rose-200/60">✦</span>
            <p className="relative text-xs font-medium text-rose-700">今日生日</p>
            <p className="relative mt-2 text-lg leading-relaxed font-semibold text-rose-900 md:text-xl">祝 {birthdayNames.join("、")} 生日快乐！</p>
          </div>}
          <div className="grid gap-3 md:grid-cols-2">
            {todayEvents.map((event) => <CalendarEventCard event={event} now={now} key={event.id} />)}
          </div>
        </section>}
        {!data.events.length && <EmptyState title="暂无事件" />}
        {eventGroups.upcoming.length > 0 && <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-muted">之后的事件</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {eventGroups.upcoming.map((event) => <CalendarEventCard event={event} now={now} key={event.id} />)}
          </div>
        </div>}
        {eventGroups.past.length > 0 && <details className="mt-5" open={Boolean(seasonSlug)}
          onToggle={(event) => { if (event.currentTarget.open) setRenderPastEvents(true); }}>
          <summary className="cursor-pointer text-sm font-semibold text-muted">过去的事件 · {eventGroups.past.length}</summary>
          {renderPastEvents && <div className="mt-3 grid gap-3 md:grid-cols-2">{eventGroups.past.map((event) => <CalendarEventCard event={event} now={now} key={event.id} />)}</div>}
        </details>}
      </section>
    </div>
  );
}
