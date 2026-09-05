import type { BroadcastSlot } from "@/domain";

type CalendarParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type LocalBroadcastDisplay = {
  weekday: string;
  time: string;
  timezone: string;
  instant: Date;
};

export function weekdayInTimeZone(timeZone: string, now = new Date()): number {
  const { year, month, day } = calendarParts(now, timeZone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

const SOURCE_ZONE_LABELS: Record<string, string> = {
  "Asia/Tokyo": "JST",
  UTC: "UTC",
};

export function calendarParts(date: Date, timeZone: string): CalendarParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function zonedDateTimeToInstant(parts: CalendarParts, timeZone: string): Date {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let instant = new Date(target);
  for (let index = 0; index < 4; index += 1) {
    const actual = calendarParts(instant, timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    instant = new Date(instant.valueOf() + target - actualAsUtc);
  }
  return instant;
}

function parseOfficialTime(value: string): { hour: number; minute: number; dayOffset: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid broadcast time: ${value}`);
  const extendedHour = Number(match[1]);
  const minute = Number(match[2]);
  if (extendedHour > 47 || minute > 59) throw new Error(`Invalid broadcast time: ${value}`);
  return { hour: extendedHour % 24, minute, dayOffset: Math.floor(extendedHour / 24) };
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function nextBroadcastInstant(
  slot: Pick<BroadcastSlot, "weekday" | "localTime" | "timezone">,
  now = new Date(),
): Date {
  const sourceNow = calendarParts(now, slot.timezone);
  const sourceDate = new Date(Date.UTC(sourceNow.year, sourceNow.month - 1, sourceNow.day));
  const official = parseOfficialTime(slot.localTime);
  const actualWeekday = (slot.weekday + official.dayOffset) % 7;
  let daysAhead = (actualWeekday - sourceDate.getUTCDay() + 7) % 7;
  let targetDate = addUtcDays(sourceDate, daysAhead);
  let instant = zonedDateTimeToInstant({
    year: targetDate.getUTCFullYear(),
    month: targetDate.getUTCMonth() + 1,
    day: targetDate.getUTCDate(),
    hour: official.hour,
    minute: official.minute,
  }, slot.timezone);
  if (instant <= now) {
    daysAhead += 7;
    targetDate = addUtcDays(sourceDate, daysAhead);
    instant = zonedDateTimeToInstant({
      year: targetDate.getUTCFullYear(),
      month: targetDate.getUTCMonth() + 1,
      day: targetDate.getUTCDate(),
      hour: official.hour,
      minute: official.minute,
    }, slot.timezone);
  }
  return instant;
}

export function broadcastInstantOnViewerDate(
  slot: Pick<BroadcastSlot, "weekday" | "localTime" | "timezone">,
  viewerTimeZone: string,
  now = new Date(),
): Date | null {
  const viewerNow = calendarParts(now, viewerTimeZone);
  return broadcastInstantOnDate(slot, viewerTimeZone, viewerNow);
}

export function broadcastInstantOnDate(
  slot: Pick<BroadcastSlot, "weekday" | "localTime" | "timezone">,
  viewerTimeZone: string,
  viewerNow: Pick<CalendarParts, "year" | "month" | "day">,
): Date | null {
  const start = zonedDateTimeToInstant({ ...viewerNow, hour: 0, minute: 0 }, viewerTimeZone);
  const followingDay = addUtcDays(
    new Date(Date.UTC(viewerNow.year, viewerNow.month - 1, viewerNow.day)),
    1,
  );
  const end = zonedDateTimeToInstant({
    year: followingDay.getUTCFullYear(),
    month: followingDay.getUTCMonth() + 1,
    day: followingDay.getUTCDate(),
    hour: 0,
    minute: 0,
  }, viewerTimeZone);
  const occurrence = nextBroadcastInstant(slot, new Date(start.valueOf() - 1));
  return occurrence < end ? occurrence : null;
}

export function timeZoneLabel(timeZone: string, instant = new Date()): string {
  if (SOURCE_ZONE_LABELS[timeZone]) return SOURCE_ZONE_LABELS[timeZone];
  const part = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "short" })
    .formatToParts(instant)
    .find((item) => item.type === "timeZoneName");
  return part?.value ?? timeZone;
}

export function localBroadcastDisplay(
  slot: Pick<BroadcastSlot, "weekday" | "localTime" | "timezone">,
  viewerTimeZone: string,
  now = new Date(),
): LocalBroadcastDisplay {
  const instant = nextBroadcastInstant(slot, now);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: viewerTimeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: value("weekday"),
    time: `${value("hour")}:${value("minute")}`,
    timezone: timeZoneLabel(viewerTimeZone, instant),
    instant,
  };
}
