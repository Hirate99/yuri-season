import { describe, expect, test } from "bun:test";
import type { CalendarEvent } from "@/domain";
import { eventDateKey, eventOccursToday, partitionCalendarEvents } from "@/lib/calendar-events";

function event(id: string, startsAt: string, timezone = "Asia/Tokyo"): CalendarEvent {
  return {
    id,
    animeId: null,
    animeSlug: null,
    animeTitle: null,
  characterId: null,
  characterName: null,
  characterPortraitUrl: null,
  characterPortraitSourceUrl: null,
    eventType: "event",
    title: id,
    startsAt,
    timezone,
    recurrenceRule: null,
    sourceUrl: null,
    verified: true,
  };
}

describe("calendar event dates", () => {
  test("compares each event on its source calendar day", () => {
    const now = new Date("2026-08-11T00:30:00Z");
    const groups = partitionCalendarEvents([
      event("past", "2026-08-10T23:00:00+09:00"),
      event("today", "2026-08-11T00:00:00+09:00"),
      event("future", "2026-08-12"),
    ], now);

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["today", "future"]);
    expect(groups.past.map(({ id }) => id)).toEqual(["past"]);
  });

  test("keeps a date-only birthday independent of viewer timezone", () => {
    expect(eventDateKey(event("birthday", "2026-08-15"))).toBe("2026-08-15");
  });

  test("uses source date for birthdays and viewer date for timed events", () => {
    const birthday = { ...event("birthday", "2026-08-15T00:00:00+09:00"), eventType: "birthday" as const };
    const timed = event("stream", "2026-08-15T00:30:00+09:00");
    const now = new Date("2026-08-14T16:00:00Z");
    expect(eventOccursToday(birthday, "America/Los_Angeles", now)).toBe(true);
    expect(eventOccursToday(timed, "America/Los_Angeles", now)).toBe(true);
  });
});
