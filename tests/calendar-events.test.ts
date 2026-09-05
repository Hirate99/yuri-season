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
    endsAt: null,
    timezone,
    recurrenceRule: null,
    sourceUrl: null,
    verified: true,
    status: "scheduled",
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

  test("ignores the stored occurrence year when matching a recurring birthday", () => {
    const birthday = { ...event("birthday", "2027-02-07"), eventType: "birthday" as const };
    expect(eventOccursToday(birthday, "America/Los_Angeles", new Date("2026-02-06T15:30:00Z"))).toBe(true);
  });

  test("groups recurring birthdays within the current year", () => {
    const birthday = (id: string, startsAt: string) => ({
      ...event(id, startsAt),
      eventType: "birthday" as const,
      recurrenceRule: "FREQ=YEARLY",
    });
    const groups = partitionCalendarEvents([
      birthday("february", "2027-02-07"),
      event("next-year-event", "2027-01-10"),
      birthday("september", "2026-09-25"),
      birthday("july", "2027-07-15"),
    ], new Date("2026-08-22T19:00:00Z"));

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["september", "next-year-event"]);
    expect(groups.past.map(({ id }) => id)).toEqual(["february", "july"]);
  });

  test("keeps a multi-day event upcoming until its final source-calendar day", () => {
    const multiDay = { ...event("convention", "2026-09-04"), endsAt: "2026-09-06" };
    const now = new Date("2026-09-05T12:00:00Z");
    const groups = partitionCalendarEvents([multiDay], now);

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["convention"]);
    expect(eventOccursToday(multiDay, "America/Los_Angeles", now)).toBe(true);
  });

  test("matches each viewer day touched by a timed event range", () => {
    const multiDay = {
      ...event("festival", "2026-09-05T10:00:00+09:00"),
      endsAt: "2026-09-06T18:00:00+09:00",
    };

    expect(eventOccursToday(multiDay, "Asia/Tokyo", new Date("2026-09-06T03:00:00Z"))).toBe(true);
    expect(eventOccursToday(multiDay, "Asia/Tokyo", new Date("2026-09-07T03:00:00Z"))).toBe(false);
  });
});
