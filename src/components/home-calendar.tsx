import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { CatalogAnime, CatalogResponse } from "@/domain";
import { useViewerTimeZone } from "@/hooks/use-viewer-timezone";
import { eventOccursToday, partitionCalendarEvents } from "@/lib/calendar-events";
import { verifiedBirthdayPortrait } from "@/lib/character-portraits";
import { eventPresentation, eventTitle } from "@/lib/event-presentation";
import { weekdayLabel } from "@/lib/format";
import { bangumiCoverUrl } from "@/lib/media-url";
import { seasonPalettes, seasonVisualName } from "@/lib/season-presentation";
import { broadcastInstantOnDate, calendarParts, timeZoneLabel, weekdayInTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/ui";
import { CoverImage } from "./cover-image";
import { EpisodeProgressBadge } from "./episode-progress-badge";
import { EventTime } from "./event-time";

const JAPAN_TIME_ZONE = "Asia/Tokyo";
const BROADCAST_PAGE_SIZE = 4;
const EVENT_PAGE_SIZE = 3;
const weekdays = [1, 2, 3, 4, 5, 6, 0];

type WeekDate = {
  weekday: number;
  year: number;
  month: number;
  day: number;
};

function currentWeek(now: Date, timeZone: string): WeekDate[] {
  const today = calendarParts(now, timeZone);
  const source = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const mondayOffset = (source.getUTCDay() + 6) % 7;
  return weekdays.map((weekday, index) => {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day - mondayOffset + index));
    return {
      weekday,
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  });
}

function calendarRangeLabel(week: WeekDate[]): string {
  const first = week[0];
  const last = week[week.length - 1];
  if (!first || !last) return "";
  return first.month === last.month
    ? `${first.month}月${first.day}日 — ${last.day}日`
    : `${first.month}月${first.day}日 — ${last.month}月${last.day}日`;
}

function entriesForDay(anime: CatalogAnime[], date: WeekDate, timeZone: string) {
  return anime
    .flatMap((item) => {
      const instant = item.primarySlot && broadcastInstantOnDate(item.primarySlot, timeZone, date);
      return instant ? [{ anime: item, instant }] : [];
    })
    .sort((left, right) =>
      left.instant.valueOf() - right.instant.valueOf()
      || left.anime.titleZh.localeCompare(right.anime.titleZh));
}

export function HomeCalendar({ catalog, viewerTimeZone: initialTimeZone, renderedAt }: {
  catalog: CatalogResponse;
  viewerTimeZone: string;
  renderedAt: string;
}) {
  const viewerTimeZone = useViewerTimeZone() ?? initialTimeZone;
  const now = new Date(renderedAt);
  const today = weekdayInTimeZone(viewerTimeZone, now);
  const [daySelection, setDaySelection] = useState<{ weekday: number; timeZone: string } | null>(null);
  const selectedDay = daySelection?.timeZone === viewerTimeZone ? daySelection.weekday : today;
  const [broadcastPage, setBroadcastPage] = useState(0);
  const [eventPage, setEventPage] = useState(0);
  const week = currentWeek(now, viewerTimeZone).map((date) => ({
    ...date, entries: entriesForDay(catalog.anime, date, viewerTimeZone),
  }));
  const selectedDate = week.find((date) => date.weekday === selectedDay)!;
  const selectedEntries = selectedDate.entries;
  const broadcastPageCount = Math.max(1, Math.ceil(selectedEntries.length / BROADCAST_PAGE_SIZE));
  const visibleBroadcastPage = Math.min(broadcastPage, broadcastPageCount - 1);
  const broadcastPageStart = visibleBroadcastPage * BROADCAST_PAGE_SIZE;
  const visibleBroadcasts = selectedEntries.slice(broadcastPageStart, broadcastPageStart + BROADCAST_PAGE_SIZE);
  const allUpcomingEvents = partitionCalendarEvents(catalog.events, now).upcoming;
  const orderedUpcomingEvents = allUpcomingEvents
    .map((event, index) => ({
      event,
      index,
      priority: event.eventType === "birthday" && eventOccursToday(event, JAPAN_TIME_ZONE, now) ? 1 : 0,
    }))
    .sort((left, right) => right.priority - left.priority || left.index - right.index)
    .map(({ event }) => event);
  const eventPageCount = Math.max(1, Math.ceil(allUpcomingEvents.length / EVENT_PAGE_SIZE));
  const visibleEventPage = Math.min(eventPage, eventPageCount - 1);
  const eventPageStart = visibleEventPage * EVENT_PAGE_SIZE;
  const upcomingEvents = orderedUpcomingEvents.slice(eventPageStart, eventPageStart + EVENT_PAGE_SIZE);
  const palette = seasonPalettes[seasonVisualName(catalog.season)];

  return (
    <section className="mt-4 md:mt-8" id="calendar" aria-labelledby="home-calendar-title">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] leading-none font-semibold tracking-[0.18em] text-muted">WEEKLY INDEX · {timeZoneLabel(viewerTimeZone, now)}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="home-calendar-title" className="text-[24px] leading-none font-semibold tracking-[-0.04em] md:text-[32px]">本周放送</h2>
            <p className="text-[11px] text-muted tabular-nums md:text-xs">{calendarRangeLabel(week)}</p>
          </div>
        </div>
        <Link to="/calendar" className="inline-flex shrink-0 items-center gap-1.5 pb-0.5 text-xs font-semibold text-ink transition-colors hover:text-accent">
          完整日历 <ArrowRight size={14} />
        </Link>
      </header>

      <div className="mt-6 grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.72fr)]">
        <div className="flex min-w-0 flex-col lg:h-[430px]">
        <div className="relative bg-white px-1.5 py-1.5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-bottom-7 before:rounded-t-[20px] before:border-x before:border-t before:border-line before:content-[''] sm:px-2.5 sm:before:rounded-t-[28px]">
            <nav className="relative z-10 grid grid-cols-7 gap-0.5 sm:gap-1.5" aria-label="选择本周放送日">
              {week.map((date) => {
                const { entries } = date;
                const isSelected = date.weekday === selectedDay;
                const isToday = date.weekday === today;
                return (
                  <button
                    type="button"
                    key={date.weekday}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setDaySelection({ weekday: date.weekday, timeZone: viewerTimeZone });
                      setBroadcastPage(0);
                    }}
                    className={cn(
                      "group relative grid min-w-0 justify-items-center gap-1 rounded-[14px] px-1 py-2 transition sm:rounded-[20px]",
                      isSelected ? "text-white shadow-[0_14px_28px_-18px_rgba(37,35,43,0.65)]" : "text-muted hover:bg-raised hover:text-ink",
                    )}
                    style={isSelected ? { backgroundColor: palette.deep } : undefined}
                  >
                    <span className="text-[10px] font-medium sm:text-xs">{weekdayLabel(date.weekday)}</span>
                    <strong className="text-lg leading-none font-semibold tabular-nums sm:text-xl">{date.day}</strong>
                    <span className={cn("min-h-[10px] text-[9px] leading-[10px] tabular-nums", isSelected ? "text-white/70" : "text-muted")}>
                      {isToday ? `今天${entries.length ? ` · ${entries.length}` : ""}` : entries.length ? `${entries.length}部` : "—"}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div
            data-home-calendar-panel="broadcasts"
            className="relative z-10 flex min-h-[238px] flex-1 flex-col overflow-hidden rounded-[28px] p-5 md:p-6 lg:min-h-0"
            style={{ background: `linear-gradient(135deg, ${palette.light}40 0%, ${palette.base}2b 46%, #f8f7fa 100%)` }}
          >
            <div className="relative z-10 flex items-baseline justify-between gap-4">
              <h3 className="text-base font-semibold tracking-[-0.02em]">{weekdayLabel(selectedDay)}放送</h3>
              <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] text-muted tabular-nums">
                <span className="font-semibold tracking-[0.08em]">{selectedDate?.year}.{String(selectedDate?.month ?? "").padStart(2, "0")}.{String(selectedDate?.day ?? "").padStart(2, "0")}</span>
                <span>{selectedEntries.length ? `${selectedEntries.length} 部` : "无固定放送"}</span>
                {selectedEntries.length > BROADCAST_PAGE_SIZE && (
                  <div className="ml-0.5 flex items-center gap-1" aria-label="切换本日放送页">
                    <span className="mr-0.5 text-[9px]">{visibleBroadcastPage + 1} / {broadcastPageCount}</span>
                    <button
                      type="button"
                      aria-label="上一组本日放送"
                      disabled={visibleBroadcastPage === 0}
                      onClick={() => setBroadcastPage((page) => Math.max(0, page - 1))}
                      className="grid size-6 place-items-center rounded-full bg-white/65 transition hover:bg-white hover:text-ink disabled:cursor-default disabled:opacity-30"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="下一组本日放送"
                      disabled={visibleBroadcastPage === broadcastPageCount - 1}
                      onClick={() => setBroadcastPage((page) => Math.min(broadcastPageCount - 1, page + 1))}
                      className="grid size-6 place-items-center rounded-full bg-white/65 transition hover:bg-white hover:text-ink disabled:cursor-default disabled:opacity-30"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={cn(
              "relative z-10 mt-5 grid flex-1 gap-2.5 sm:grid-cols-2",
              selectedEntries.length ? "content-start" : "grid-rows-[minmax(0,1fr)]",
            )}>
                {visibleBroadcasts.map(({ anime, instant }) => (
                  <Link
                    key={anime.id}
                    to="/anime/$slug"
                    params={{ slug: anime.slug }}
                    className="group grid min-h-[106px] min-w-0 grid-cols-[42px_minmax(0,1fr)] gap-3 overflow-hidden rounded-[16px] bg-white/85 p-3 shadow-[0_9px_24px_-18px_rgba(37,35,43,0.5)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white lg:h-[120px] lg:min-h-0"
                  >
                    <CoverImage className="aspect-[3/4] w-[42px] rounded-[7px]" src={bangumiCoverUrl(anime.coverUrl, 100)} alt={`${anime.titleZh} 封面`} />
                    <div className="min-w-0">
                      {anime.primarySlot && (
                        <span className="block">
                          <strong className="block text-sm tabular-nums">
                            {new Intl.DateTimeFormat("en-GB", { timeZone: viewerTimeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant)} <small className="font-medium text-muted">{timeZoneLabel(viewerTimeZone, instant)}</small>
                          </strong>
                          {viewerTimeZone !== anime.primarySlot.timezone && (
                            <small className="mt-0.5 block whitespace-nowrap text-[11px] font-normal tabular-nums text-muted">
                              {weekdayLabel(anime.primarySlot.weekday)} {anime.primarySlot.localTime} {timeZoneLabel(anime.primarySlot.timezone, instant)}
                            </small>
                          )}
                        </span>
                      )}
                      <h3 className="mt-1 line-clamp-2 text-[13px] leading-[18px] font-semibold group-hover:text-accent">{anime.titleZh}</h3>
                      <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[10px] text-muted">
                        <EpisodeProgressBadge episode={anime.currentEpisode} />
                        <span className="truncate">{anime.primarySlot?.label}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {!selectedEntries.length && (
                  <div className="col-span-full grid h-full min-h-32 place-items-center rounded-[20px] bg-white/45 px-5 text-center">
                    <p className="text-sm text-muted">这一天没有固定放送，换一天看看。</p>
                  </div>
                )}
            </div>
          </div>
        </div>

        <aside
          data-home-calendar-panel="events"
          className="flex min-h-full flex-col overflow-hidden rounded-[28px] p-5 md:p-6 lg:h-[430px]"
          style={{ background: `linear-gradient(155deg, #faf9fb 20%, ${palette.base}24 100%)` }}
          aria-labelledby="upcoming-events-title"
        >
          <header className="flex items-center justify-between gap-3">
            <h3 id="upcoming-events-title" className="text-base font-bold">近日事件</h3>
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-bold tracking-[0.2em] text-muted">EVENTS</span>
              {allUpcomingEvents.length > EVENT_PAGE_SIZE && (
                <div className="flex items-center gap-1" aria-label="切换近期事件页">
                  <span className="mr-0.5 text-[9px] text-muted tabular-nums">{visibleEventPage + 1} / {eventPageCount}</span>
                  <button
                    type="button"
                    aria-label="上一组近期事件"
                    disabled={visibleEventPage === 0}
                    onClick={() => setEventPage((page) => Math.max(0, page - 1))}
                    className="grid size-6 place-items-center rounded-full bg-white/70 text-muted transition hover:bg-white hover:text-ink disabled:cursor-default disabled:opacity-30"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="下一组近期事件"
                    disabled={visibleEventPage === eventPageCount - 1}
                    onClick={() => setEventPage((page) => Math.min(eventPageCount - 1, page + 1))}
                    className="grid size-6 place-items-center rounded-full bg-white/70 text-muted transition hover:bg-white hover:text-ink disabled:cursor-default disabled:opacity-30"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          </header>
          <div
            className={cn(
              "mt-4 grid flex-1 gap-3",
              upcomingEvents.length ? "min-h-0 grid-rows-[repeat(3,minmax(0,1fr))]" : "place-items-center",
            )}
            aria-live="polite"
          >
            {upcomingEvents.map((event) => {
              const presentation = eventPresentation(event.eventType);
              const portrait = verifiedBirthdayPortrait(event);
              const isToday = eventOccursToday(event, JAPAN_TIME_ZONE, now);
              const isBirthday = event.eventType === "birthday";
              return (
                <article
                  key={event.id}
                  data-event-today={isToday || undefined}
                  data-event-birthday={isBirthday || undefined}
                  className={cn(
                    "relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-[14px] px-3 py-2.5",
                  )}
                  style={isToday ? {
                    backgroundImage: isBirthday
                      ? `linear-gradient(112deg, ${palette.warm}3d 0%, ${palette.light}24 52%, rgba(255,255,255,0.58) 100%)`
                      : `linear-gradient(112deg, ${palette.warm}24 0%, ${palette.base}18 54%, rgba(255,255,255,0.52) 100%)`,
                  } : undefined}
                >
                  <div className="flex min-h-0 min-w-0 flex-col">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <EventTime event={event} viewerTimeZone={viewerTimeZone} />
                      {isToday && <span className="text-[10px] font-semibold tracking-[0.08em]" style={{ color: palette.deep }}>今天</span>}
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${isBirthday ? palette.warm : palette.base}32`, color: palette.deep }}>
                        {presentation.label}
                      </span>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col justify-center pt-1">
                      <h4 className="truncate text-[13px] leading-[19px] font-semibold">
                        {event.animeSlug
                          ? <Link to="/anime/$slug" params={{ slug: event.animeSlug }} className="hover:text-accent">{eventTitle(event)}</Link>
                          : eventTitle(event)}
                      </h4>
                      {(event.animeTitle || event.characterName) && <p className="mt-1 truncate text-[11px] leading-4 text-muted">{event.animeTitle ?? event.characterName}</p>}
                    </div>
                  </div>
                  {portrait && <CoverImage className="mt-1 size-10 rounded-full ring-2 ring-white" src={portrait.imageUrl} alt={`${event.characterName ?? "角色"}头像`} />}
                  {event.sourceUrl && (
                    <a className="absolute -top-1 -right-1 grid size-7 place-items-center rounded-full text-muted transition hover:bg-white hover:text-ink" href={event.sourceUrl} target="_blank" rel="noreferrer" aria-label="查看事件来源">
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                </article>
              );
            })}
            {!upcomingEvents.length && <p className="text-sm leading-6 text-muted">暂时没有已确认的近期事件。</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
