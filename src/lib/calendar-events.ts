import type { CalendarEvent } from "@/domain";

function dateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function safeDateKey(date: Date, timeZone: string): string {
  try {
    return dateKey(date, timeZone);
  } catch {
    return dateKey(date, "UTC");
  }
}

export function eventDateKey(event: Pick<CalendarEvent, "startsAt" | "timezone">): string | null {
  if (!event.startsAt) return null;
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(event.startsAt);
  if (dateOnly) return dateOnly[1];
  const date = new Date(event.startsAt);
  if (Number.isNaN(date.valueOf())) return null;
  return safeDateKey(date, event.timezone);
}

export function eventOccursToday(event: CalendarEvent, viewerTimeZone: string, now = new Date()): boolean {
  if (!event.startsAt) return false;
  const date = new Date(event.startsAt);
  if (event.eventType === "birthday") {
    const eventDay = eventDateKey(event);
    const today = safeDateKey(now, event.timezone);
    return eventDay?.slice(5) === today.slice(5);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(event.startsAt)) {
    return eventDateKey(event) === safeDateKey(now, event.timezone);
  }
  return !Number.isNaN(date.valueOf())
    && safeDateKey(date, viewerTimeZone) === safeDateKey(now, viewerTimeZone);
}

function eventComparisonDateKey(event: CalendarEvent, now: Date): string | null {
  const eventDay = eventDateKey(event);
  if (event.eventType !== "birthday" || eventDay === null) return eventDay;
  const currentYear = safeDateKey(now, event.timezone).slice(0, 4);
  return `${currentYear}-${eventDay.slice(5)}`;
}

export function partitionCalendarEvents(events: CalendarEvent[], now = new Date()) {
  const upcoming: Array<{ event: CalendarEvent; dateKey: string | null }> = [];
  const past: Array<{ event: CalendarEvent; dateKey: string }> = [];
  for (const event of events) {
    const eventDay = eventComparisonDateKey(event, now);
    const today = safeDateKey(now, event.timezone);
    if (eventDay === null || eventDay >= today) upcoming.push({ event, dateKey: eventDay });
    else past.push({ event, dateKey: eventDay });
  }
  const tieBreak = (left: CalendarEvent, right: CalendarEvent) =>
    left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  upcoming.sort((left, right) => {
    if (left.dateKey === null) return right.dateKey === null ? tieBreak(left.event, right.event) : 1;
    if (right.dateKey === null) return -1;
    return left.dateKey.localeCompare(right.dateKey) || tieBreak(left.event, right.event);
  });
  past.sort((left, right) =>
    left.dateKey.localeCompare(right.dateKey) || tieBreak(left.event, right.event));
  return {
    upcoming: upcoming.map(({ event }) => event),
    past: past.map(({ event }) => event),
  };
}
