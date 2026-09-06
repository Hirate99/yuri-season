import { describe, expect, test } from "bun:test";
import {
  broadcastInstantOnViewerDate,
  localBroadcastDisplay,
  nextBroadcastInstant,
  weekdayInTimeZone,
} from "@/lib/timezone";

describe("broadcast timezone conversion", () => {
  test("finds the calendar weekday in its source timezone", () => {
    const now = new Date("2026-08-16T16:30:00Z");
    expect(weekdayInTimeZone("America/Los_Angeles", now)).toBe(0);
    expect(weekdayInTimeZone("Asia/Tokyo", now)).toBe(1);
  });

  test("keeps Japanese extended-hour notation on the following calendar day", () => {
    const slot = { weekday: 2, localTime: "24:30", timezone: "Asia/Tokyo" };
    const instant = nextBroadcastInstant(slot, new Date("2026-08-10T00:00:00Z"));
    expect(instant.toISOString()).toBe("2026-08-11T15:30:00.000Z");

    const local = localBroadcastDisplay(
      slot,
      "America/Los_Angeles",
      new Date("2026-08-10T00:00:00Z"),
    );
    expect(local).toMatchObject({ weekday: "周二", time: "08:30", timezone: "PDT" });
  });

  test("supports 25-hour Japanese schedules without moving the official weekday", () => {
    const slot = { weekday: 6, localTime: "25:05", timezone: "Asia/Tokyo" };
    expect(nextBroadcastInstant(slot, new Date("2026-08-10T00:00:00Z")).toISOString()).toBe(
      "2026-08-15T16:05:00.000Z",
    );
  });

  test("finds a Japanese broadcast on the viewer's local calendar day", () => {
    const slot = { weekday: 2, localTime: "24:30", timezone: "Asia/Tokyo" };
    expect(
      broadcastInstantOnViewerDate(
        slot,
        "America/Los_Angeles",
        new Date("2026-08-11T19:00:00Z"),
      )?.toISOString(),
    ).toBe("2026-08-11T15:30:00.000Z");
    expect(
      broadcastInstantOnViewerDate(
        slot,
        "Europe/Paris",
        new Date("2026-08-11T19:00:00Z"),
      )?.toISOString(),
    ).toBe("2026-08-11T15:30:00.000Z");
  });
});
