import { describe, expect, test } from "bun:test";
import type { AnimeSummary, BroadcastSlot } from "@/domain";
import { localDayOrdinal, orderBannerForHome, orderWorksForToday, rotateList } from "@/lib/home-ordering";

function slot(weekday: number, localTime: string, timezone = "Asia/Tokyo"): BroadcastSlot {
  return { id: `slot-${weekday}-${localTime}`, label: "TOKYO MX", weekday, localTime, timezone, platformUrl: null, isPrimary: true };
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

  test("works section puts today's airings first, ascending by air time", () => {
    const a = anime("a", slot(2, "24:30"));
    const b = anime("b", slot(3, "23:00"));
    const c = anime("c", slot(5, "23:00"));
    expect(orderWorksForToday([c, b, a], "Asia/Tokyo", now).map((item) => item.id))
      .toEqual(["a", "b", "c"]);
  });

  test("works section keeps the remaining order stable across dates", () => {
    const a = anime("a", slot(2, "24:30"));
    const b = anime("b", slot(3, "23:00"));
    const c = anime("c", slot(5, "23:00"));
    const tuesday = new Date("2026-08-11T05:00:00Z");
    const thursday = new Date("2026-08-13T05:00:00Z");
    const tuesdayOrder = orderWorksForToday([a, b, c], "Asia/Tokyo", tuesday).map((item) => item.id);
    const thursdayOrder = orderWorksForToday([a, b, c], "Asia/Tokyo", thursday).map((item) => item.id);
    expect(tuesdayOrder).toEqual(thursdayOrder);
  });

  test("banner rotates the non-airing remainder deterministically by local date", () => {
    const a = anime("a", slot(0, "23:00"));
    const b = anime("b", slot(1, "23:00"));
    const c = anime("c", slot(2, "23:00"));
    const monday = new Date("2026-08-10T05:00:00Z");
    const tuesday = new Date("2026-08-11T05:00:00Z");
    const mondayIds = orderBannerForHome([a, b, c], "Asia/Tokyo", monday).map((item) => item.id);
    const mondayAgain = orderBannerForHome([a, b, c], "Asia/Tokyo", monday).map((item) => item.id);
    const tuesdayIds = orderBannerForHome([a, b, c], "Asia/Tokyo", tuesday).map((item) => item.id);
    expect(mondayIds).toEqual(mondayAgain);
    expect(mondayIds).not.toEqual(tuesdayIds);
    expect([...mondayIds].sort()).toEqual(["a", "b", "c"]);
  });

  test("respects the viewer's local date when partitioning airings", () => {
    const monday = anime("monday", slot(1, "23:00"));
    const tuesday = anime("tuesday", slot(2, "23:00"));
    const mondayEvening = new Date("2026-08-10T16:00:00Z");
    const tokyo = orderWorksForToday([monday, tuesday], "Asia/Tokyo", mondayEvening).map((item) => item.id);
    const la = orderWorksForToday([monday, tuesday], "America/Los_Angeles", mondayEvening).map((item) => item.id);
    expect(tokyo).toEqual(["tuesday", "monday"]);
    expect(la).toEqual(["monday", "tuesday"]);
  });

  test("rotateList shifts by seed modulo length", () => {
    expect(rotateList(["a", "b", "c"], 0)).toEqual(["a", "b", "c"]);
    expect(rotateList(["a", "b", "c"], 1)).toEqual(["b", "c", "a"]);
    expect(rotateList(["a", "b", "c"], 4)).toEqual(["b", "c", "a"]);
    expect(rotateList(["a"], 5)).toEqual(["a"]);
    expect(rotateList([], 5)).toEqual([]);
  });

  test("localDayOrdinal is stable for a given local date", () => {
    expect(localDayOrdinal("Asia/Tokyo", now)).toBe(localDayOrdinal("Asia/Tokyo", now));
  });
});
