import { describe, expect, setSystemTime, test } from "bun:test";
import type { CalendarEvent } from "@/domain";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarEventCard } from "@/features/calendar/calendar-event-card";
import { CalendarPage } from "@/pages/calendar-page";
import { ViewerTimeZoneContext } from "@/hooks/use-viewer-timezone";
import {
  eventDateKey,
  eventIsOngoing,
  eventOccursToday,
  partitionCalendarEvents,
} from "@/lib/calendar-events";

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
    const groups = partitionCalendarEvents(
      [
        event("past", "2026-08-10T23:00:00+09:00"),
        event("today", "2026-08-11T00:00:00+09:00"),
        event("future", "2026-08-12"),
      ],
      now,
    );

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["today", "future"]);
    expect(groups.past.map(({ id }) => id)).toEqual(["past"]);
  });

  test("keeps a date-only birthday independent of viewer timezone", () => {
    expect(eventDateKey(event("birthday", "2026-08-15"))).toBe("2026-08-15");
  });

  test("uses source date for birthdays and viewer date for timed events", () => {
    const birthday = {
      ...event("birthday", "2026-08-15T00:00:00+09:00"),
      eventType: "birthday" as const,
    };
    const timed = event("stream", "2026-08-15T00:30:00+09:00");
    const now = new Date("2026-08-14T16:00:00Z");
    expect(eventOccursToday(birthday, "America/Los_Angeles", now)).toBe(true);
    expect(eventOccursToday(timed, "America/Los_Angeles", now)).toBe(true);
  });

  test("ignores the stored occurrence year when matching a recurring birthday", () => {
    const birthday = { ...event("birthday", "2027-02-07"), eventType: "birthday" as const };
    expect(
      eventOccursToday(birthday, "America/Los_Angeles", new Date("2026-02-06T15:30:00Z")),
    ).toBe(true);
  });

  test("groups recurring birthdays within the current year", () => {
    const birthday = (id: string, startsAt: string) => ({
      ...event(id, startsAt),
      eventType: "birthday" as const,
      recurrenceRule: "FREQ=YEARLY",
    });
    const groups = partitionCalendarEvents(
      [
        birthday("february", "2027-02-07"),
        event("next-year-event", "2027-01-10"),
        birthday("september", "2026-09-25"),
        birthday("july", "2027-07-15"),
      ],
      new Date("2026-08-22T19:00:00Z"),
    );

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["september", "next-year-event"]);
    expect(groups.past.map(({ id }) => id)).toEqual(["february", "july"]);
  });

  test("keeps a multi-day event upcoming until its final source-calendar day", () => {
    const multiDay = { ...event("convention", "2026-09-04"), endsAt: "2026-09-06" };
    const now = new Date("2026-09-05T12:00:00Z");
    const groups = partitionCalendarEvents([multiDay], now);

    expect(groups.upcoming.map(({ id }) => id)).toEqual(["convention"]);
    expect(eventOccursToday(multiDay, "America/Los_Angeles", now)).toBe(true);
    expect(eventIsOngoing(multiDay, new Date("2026-09-06T14:59:59Z"))).toBe(true);
    expect(eventIsOngoing(multiDay, new Date("2026-09-06T15:00:00Z"))).toBe(false);
  });

  test("matches each viewer day touched by a timed event range", () => {
    const multiDay = {
      ...event("festival", "2026-09-05T10:00:00+09:00"),
      endsAt: "2026-09-06T18:00:00+09:00",
    };

    expect(eventOccursToday(multiDay, "Asia/Tokyo", new Date("2026-09-06T03:00:00Z"))).toBe(true);
    expect(eventOccursToday(multiDay, "Asia/Tokyo", new Date("2026-09-07T03:00:00Z"))).toBe(false);
  });

  test("only marks an active timed range as ongoing on calendar cards", () => {
    const active = { ...event("stream", "2026-09-05T10:00:00Z"), endsAt: "2026-09-05T12:00:00Z" };
    const now = new Date("2026-09-05T11:00:00Z");
    expect(eventIsOngoing(active, new Date("2026-09-05T09:59:59Z"))).toBe(false);
    expect(eventIsOngoing(active, new Date("2026-09-05T10:00:00Z"))).toBe(true);
    expect(eventIsOngoing(active, new Date(active.endsAt))).toBe(false);
    for (const candidate of [
      active,
      { ...active, status: "cancelled" as const },
      { ...active, status: "completed" as const },
      { ...active, endsAt: null },
      { ...active, eventType: "birthday" as const },
    ]) {
      const html = renderToStaticMarkup(
        createElement(CalendarEventCard, { event: candidate, now }),
      );
      expect(html.includes("进行中")).toBe(candidate === active);
      expect(html.includes("bg-[#eaf4dc]")).toBe(candidate === active);
    }
  });

  test("today's panel uses JST independently of the viewer, with birthday wishes and only active green badges", () => {
    setSystemTime(new Date("2026-09-06T03:28:00Z"));
    try {
      const events = [
        { ...event("ABEMA", "2026-09-06T01:30:00Z"), endsAt: "2026-09-06T06:00:00Z" },
        { ...event("碧蓝航线舞台", "2026-09-06T04:50:00Z"), endsAt: "2026-09-06T05:45:00Z" },
        { ...event("今天已结束", "2026-09-06T00:00:00Z"), endsAt: "2026-09-06T01:00:00Z" },
        event("JST昨天的活动", "2026-09-05T08:00:00Z"),
        event("JST今晚的活动", "2026-09-06T14:00:00Z"),
        { ...event("小蓝生日", "2000-09-06"), eventType: "birthday" as const },
        event("明天的活动", "2026-09-07"),
      ];
      const data = {
        season: {
          id: "summer",
          slug: "2026-summer",
          label: "2026 夏",
          startsOn: "2026-07-01",
          endsOn: "2026-09-30",
        },
        entries: [],
        events,
      };
      const html = renderToStaticMarkup(
        createElement(
          ViewerTimeZoneContext.Provider,
          { value: "America/Los_Angeles" },
          createElement(CalendarPage, { data }),
        ),
      );
      const panel = html.slice(
        html.indexOf('aria-labelledby="today-events-title"'),
        html.indexOf("之后的事件"),
      );
      for (const title of ["ABEMA", "碧蓝航线舞台", "今天已结束", "JST今晚的活动"])
        expect(panel.split(title)).toHaveLength(2);
      expect(panel).toContain("祝 小蓝 生日快乐！");
      expect(panel).toContain("9月6日 · JST");
      expect(panel).toContain("21:50");
      expect(panel).not.toContain("明天的活动");
      expect(panel).not.toContain("JST昨天的活动");
      expect(html.match(/进行中/g)).toHaveLength(1);
      expect(html.split("今天已结束")).toHaveLength(2);
      const empty = renderToStaticMarkup(
        createElement(CalendarPage, {
          data: { ...data, events: [event("未来活动", "2026-09-07")] },
        }),
      );
      expect(empty).toContain("未来活动");
      expect(empty).not.toContain("today-events-title");
      expect(empty).not.toContain("今日生日祝福");
    } finally {
      setSystemTime();
    }
  });
});
