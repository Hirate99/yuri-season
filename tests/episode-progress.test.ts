import { describe, expect, test } from "bun:test";
import { resolveCurrentEpisode } from "@/lib/episode-progress";

const weekly = {
  status: "airing" as const,
  premiereAt: "2026-07-05T00:00:00+09:00",
  episodeCount: 12,
  premiereEpisodeCount: 1,
  latestVerifiedEpisode: null,
};

describe("episode progress", () => {
  test("estimates weekly progress before an official episode has been captured", () => {
    expect(resolveCurrentEpisode(weekly, new Date("2026-08-09T00:01:00+09:00"))).toBe(6);
  });

  test("supports multi-episode premieres", () => {
    expect(
      resolveCurrentEpisode(
        {
          ...weekly,
          premiereAt: "2026-07-02T23:00:00+09:00",
          premiereEpisodeCount: 3,
        },
        new Date("2026-08-06T23:30:00+09:00"),
      ),
    ).toBe(8);
  });

  test("lets verified progress override the estimate and caps at the total", () => {
    expect(
      resolveCurrentEpisode(
        { ...weekly, latestVerifiedEpisode: 7 },
        new Date("2026-08-01T00:00:00+09:00"),
      ),
    ).toBe(7);
    expect(
      resolveCurrentEpisode(
        { ...weekly, latestVerifiedEpisode: 99 },
        new Date("2026-08-01T00:00:00+09:00"),
      ),
    ).toBe(12);
  });

  test("does not show an episode before premiere", () => {
    expect(resolveCurrentEpisode(weekly, new Date("2026-07-04T23:59:59+09:00"))).toBeNull();
  });
});
