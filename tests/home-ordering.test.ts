import { describe, expect, test } from "bun:test";
import type { AnimeSummary, BroadcastSlot } from "@/domain";
import {
  orderByBroadcastFromToday,
  orderByNextBroadcast,
  partitionByAiringToday,
} from "@/lib/home-ordering";

function slot(weekday: number, localTime: string, timezone = "Asia/Tokyo"): BroadcastSlot {
  return {
    id: `slot-${weekday}-${localTime}`,
    label: "TOKYO MX",
    weekday,
    localTime,
    timezone,
    platformUrl: null,
    isPrimary: true,
  };
}

function anime(id: string, primarySlot: BroadcastSlot | null): AnimeSummary {
  return {
    id,
    slug: id,
    titleZh: id,
    titleZhSourceUrl: null,
    titleJa: id,
    titleEn: null,
    synopsis: "",
    editorialNote: null,
    yuriKind: "canon",
    yuriStatus: "confirmed",
    status: "airing",
    premiereAt: "2026-07-01T00:00:00+09:00",
    episodeCount: null,
    episodeDurationMin: null,
    premiereEpisodeCount: 1,
    latestVerifiedEpisode: null,
    latestEpisodeSourceUrl: null,
    latestEpisodeCheckedAt: null,
    currentEpisode: null,
    studio: null,
    sourceMaterial: null,
    officialUrl: null,
    bangumiUrl: null,
    officialXUrl: null,
    coverUrl: null,
    coverSourceUrl: null,
    mainCharacterSourceUrl: null,
    mainCharacterExpectedCount: null,
    mainCharacterCheckedAt: null,
    visualTheme: "rose",
    featured: false,
    primarySlot,
    latestFeedAt: null,
    feedCount: 0,
  };
}

describe("home ordering", () => {
  const now = new Date("2026-08-12T05:00:00Z");

  test("keeps already-aired works on the viewer's current day before upcoming days", () => {
    const fridayEvening = new Date("2026-09-05T02:00:00Z");
    const source = [
      anime("saturday-midnight", slot(6, "24:00")),
      anime("thursday", slot(4, "23:00")),
      anime("friday-later", slot(5, "24:30")),
      anime("kore-kaite-shine", slot(5, "23:30")),
      anime("unknown", null),
    ];
    const original = [...source];
    expect(
      orderByBroadcastFromToday(source, "America/Los_Angeles", fridayEvening).map(({ id }) => id),
    ).toEqual(["kore-kaite-shine", "friday-later", "saturday-midnight", "thursday", "unknown"]);
    expect(source).toEqual(original);
    expect(
      orderByBroadcastFromToday(source, "Asia/Tokyo", fridayEvening).map(({ id }) => id),
    ).toEqual(["friday-later", "saturday-midnight", "thursday", "kore-kaite-shine", "unknown"]);
    expect(
      orderByBroadcastFromToday(
        source,
        "America/Los_Angeles",
        new Date("2026-09-05T07:00:00Z"),
      ).map(({ id }) => id),
    ).toEqual(["saturday-midnight", "thursday", "kore-kaite-shine", "friday-later", "unknown"]);
  });

  test("orders the full week by next broadcast, moving elapsed airings to next week", () => {
    const source = [
      anime("monday", slot(1, "23:00")),
      anime("already-aired", slot(3, "10:00")),
      anime("friday", slot(5, "23:00")),
      anime("tonight", slot(3, "23:00")),
      anime("thursday", slot(4, "23:00")),
    ];
    const original = [...source];
    expect(orderByNextBroadcast(source, now).map(({ id }) => id)).toEqual([
      "tonight",
      "thursday",
      "friday",
      "monday",
      "already-aired",
    ]);
    expect(source).toEqual(original);
  });

  test("compares extended Japanese hours and different time zones as actual instants", () => {
    const source = [
      anime("japan-midnight", slot(3, "24:30")),
      anime("utc-afternoon", slot(3, "15:00", "UTC")),
      anime("japan-evening", slot(3, "23:00")),
      anime("la-morning", slot(3, "06:00", "America/Los_Angeles")),
    ];
    expect(orderByNextBroadcast(source, now).map(({ id }) => id)).toEqual([
      "la-morning",
      "japan-evening",
      "utc-afternoon",
      "japan-midnight",
    ]);
  });

  test("puts unscheduled works last and resolves matching times consistently", () => {
    const source = [
      anime("unknown-b", null),
      anime("b", slot(4, "23:00")),
      anime("unknown-a", null),
      anime("a", slot(4, "23:00")),
    ];
    expect(orderByNextBroadcast(source, now).map(({ id }) => id)).toEqual([
      "a",
      "b",
      "unknown-a",
      "unknown-b",
    ]);
    expect(orderByNextBroadcast([...source].reverse(), now)).toEqual(
      orderByNextBroadcast(source, now),
    );
  });

  test("works section puts today's airings first, ascending by air time", () => {
    const a = anime("a", slot(2, "24:30"));
    const b = anime("b", slot(3, "23:00"));
    const c = anime("c", slot(5, "23:00"));
    const { airingToday, rest } = partitionByAiringToday([c, b, a], "Asia/Tokyo", now);
    expect(airingToday.map((item) => item.id)).toEqual(["a", "b"]);
    expect(rest.map((item) => item.id)).toEqual(["c"]);
  });

  test("works section keeps the remaining order stable across dates", () => {
    const a = anime("a", slot(2, "24:30"));
    const b = anime("b", slot(3, "23:00"));
    const c = anime("c", slot(5, "23:00"));
    const tuesday = new Date("2026-08-11T05:00:00Z");
    const thursday = new Date("2026-08-13T05:00:00Z");
    const tuesdayOrder = partitionByAiringToday([a, b, c], "Asia/Tokyo", tuesday).rest.map(
      (item) => item.id,
    );
    const thursdayOrder = partitionByAiringToday([a, b, c], "Asia/Tokyo", thursday).rest.map(
      (item) => item.id,
    );
    expect(tuesdayOrder).toEqual(thursdayOrder);
  });

  test("respects the viewer's local date when partitioning airings", () => {
    const monday = anime("monday", slot(1, "23:00"));
    const tuesday = anime("tuesday", slot(2, "23:00"));
    const mondayEvening = new Date("2026-08-10T16:00:00Z");
    const tokyo = partitionByAiringToday(
      [monday, tuesday],
      "Asia/Tokyo",
      mondayEvening,
    ).airingToday.map((item) => item.id);
    const la = partitionByAiringToday(
      [monday, tuesday],
      "America/Los_Angeles",
      mondayEvening,
    ).airingToday.map((item) => item.id);
    expect(tokyo).toEqual(["tuesday"]);
    expect(la).toEqual(["monday"]);
  });
});
