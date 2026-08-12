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
  if (event.eventType === "birthday" || /^\d{4}-\d{2}-\d{2}$/.test(event.startsAt)) {
    return eventDateKey(event) === safeDateKey(now, event.timezone);
  }
  return !Number.isNaN(date.valueOf())
    && safeDateKey(date, viewerTimeZone) === safeDateKey(now, viewerTimeZone);
}

export function partitionCalendarEvents(events: CalendarEvent[], now = new Date()) {
  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];
  for (const event of events) {
    const eventDay = eventDateKey(event);
    const today = safeDateKey(now, event.timezone);
    (eventDay === null || eventDay >= today ? upcoming : past).push(event);
  }
  return { upcoming, past: past.reverse() };
}
