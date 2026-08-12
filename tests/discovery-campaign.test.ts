import { describe, expect, test } from "bun:test";
import {
  cancelCampaignQueries,
  completeCampaignResults,
  createCampaign,
  leaseCampaignQueries,
  memoryRecordsForResults,
} from "../scripts/lib/discovery-campaign";
import type { DiscoveryQuery } from "../scripts/lib/discovery-query-plan";

function query(id: string): DiscoveryQuery {
  return {
    id, scopeType: "anime", scopeId: "anime-1", animeId: "anime-1", animeTitle: "作品",
    searchKind: "community", targetKey: id, queryText: `query ${id}`, priority: 4,
    cadenceDays: 14, reason: "test", rememberedAt: null, knownHits: [],
  };
}

describe("resumable discovery campaigns", () => {
  test("leases a bounded workset and recovers an expired lease", () => {
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 3, queries: [query("q1"), query("q2"), query("q3")],
    });
    expect(leaseCampaignQueries(campaign, 2, new Date("2026-08-11T20:00:00Z")).map((item) => item.id))
      .toEqual(["q1", "q2"]);
    expect(leaseCampaignQueries(campaign, 2, new Date("2026-08-11T23:00:00Z")).map((item) => item.id))
      .toEqual(["q1", "q2"]);
    expect(campaign.queries[0].attemptCount).toBe(2);
  });

  test("derives memory and completes only recorded work", async () => {
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 2, queries: [query("q1"), query("q2")],
    });
    leaseCampaignQueries(campaign, 1, new Date("2026-08-11T20:00:00Z"));
    const results = [{
      queryId: "q1", searchedAt: "2026-08-11T20:15:00Z", status: "active" as const,
      notes: "no indexed result", hits: [],
    }];
    const records = await memoryRecordsForResults(campaign, results);
    expect(records[0]).toMatchObject({ targetKey: "q1", lastResultCount: 0, usefulResultCount: 0 });
    expect(records[0].nextSearchAt).toBe("2026-08-25T20:15:00.000Z");
    completeCampaignResults(campaign, results, new Date("2026-08-11T20:16:00Z"));
    expect(campaign.queries.map((item) => item.state)).toEqual(["completed", "pending"]);
  });

  test("refuses results that were not leased", async () => {
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 1, queries: [query("q1")],
    });
    await expect(memoryRecordsForResults(campaign, [{
      queryId: "q1", searchedAt: "2026-08-11T20:15:00Z", status: "active", hits: [],
    }])).rejects.toThrow("not leased");
  });

  test("cancels removed scopes without creating search memory", () => {
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 2, queries: [query("q1"), query("q2")],
    });
    leaseCampaignQueries(campaign, 1, new Date("2026-08-11T20:00:00Z"));
    expect(cancelCampaignQueries(campaign, "anime", "anime-1", "removed", new Date("2026-08-11T20:01:00Z"))).toBe(2);
    expect(campaign.queries.map((item) => item.state)).toEqual(["cancelled", "cancelled"]);
    expect(campaign.queries.every((item) => item.cancellationReason === "removed")).toBe(true);
    expect(leaseCampaignQueries(campaign, 2, new Date("2026-08-11T20:02:00Z"))).toEqual([]);
  });
});
