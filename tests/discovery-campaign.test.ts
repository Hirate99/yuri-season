import { describe, expect, test } from "bun:test";
import {
  campaignCompletionAudit,
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
    reason: "test", rememberedAt: null, knownHits: [],
    operation: "search", stage: "explore", maxFreshHours: 30 * 24,
    completionPolicy: {
      allowedCompleteSurfaces: [], mustReachPreviousCursor: false,
      recordEveryOriginal: false, searchEngineCanComplete: true,
    },
    cursor: {}, socialAuditEligible: false,
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

  test("prioritizes explicitly requested platforms without consuming unrelated work", () => {
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 summer" },
      queryBudget: 3,
      queries: [
        query("birthday"),
        { ...query("x"), platform: "X", searchKind: "social" },
        { ...query("instagram"), platform: "Instagram", searchKind: "social" },
      ],
    });
    const platforms = new Set(["x", "instagram"]);
    expect(leaseCampaignQueries(
      campaign,
      500,
      new Date("2026-08-11T20:00:00Z"),
      (item) => Boolean(item.platform && platforms.has(item.platform.toLowerCase())),
    ).map((item) => item.id)).toEqual(["x", "instagram"]);
    expect(campaign.queries[0].state).toBe("pending");
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
      outcome: "complete" as const,
      nextCheckAt: "2026-08-12T08:00:00Z", reasonCodes: ["quiet_but_unresolved"],
      notes: "no indexed result", hits: [],
    }];
    const records = await memoryRecordsForResults(campaign, results);
    expect(records[0]).toMatchObject({ targetKey: "q1", lastResultCount: 0, usefulResultCount: 0 });
    expect(records[0].nextSearchAt).toBe("2026-08-12T08:00:00.000Z");
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
      outcome: "complete",
    }])).rejects.toThrow("not leased");
  });

  test("requires verifiable coverage before completing a timeline scan", async () => {
    const timeline = {
      ...query("timeline"), operation: "timeline_scan" as const, stage: "official" as const,
      maxFreshHours: 24, cursor: { committedPostId: "100" }, socialAuditEligible: true,
      completionPolicy: {
        allowedCompleteSurfaces: ["signed_in_timeline", "public_embed", "platform_api"] as const,
        mustReachPreviousCursor: true, recordEveryOriginal: true, searchEngineCanComplete: false,
      },
    } satisfies DiscoveryQuery;
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 1, queries: [timeline],
    });
    leaseCampaignQueries(campaign, 1, new Date("2026-08-11T20:00:00Z"));

    await expect(memoryRecordsForResults(campaign, [{
      queryId: "timeline", searchedAt: "2026-08-11T20:15:00Z", outcome: "complete",
      surface: "search_engine", status: "active", nextCheckAt: "2026-08-12T08:00:00Z", coverage: {
        reachedPreviousCursor: true, originalPostsInspected: 0,
      }, hits: [],
    }])).rejects.toThrow("search_engine cannot complete timeline_scan");
  });

  test("lets the agent schedule earlier while enforcing freshness and persists a stable cursor", async () => {
    const timeline = {
      ...query("timeline"), operation: "timeline_scan" as const, stage: "official" as const,
      maxFreshHours: 24, cursor: { committedPostId: "100" }, socialAuditEligible: true,
      completionPolicy: {
        allowedCompleteSurfaces: ["signed_in_timeline"] as const,
        mustReachPreviousCursor: true, recordEveryOriginal: true, searchEngineCanComplete: false,
      },
    } satisfies DiscoveryQuery;
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 1, queries: [timeline],
    });
    leaseCampaignQueries(campaign, 1, new Date("2026-08-11T20:00:00Z"));
    const result = {
      queryId: "timeline", searchedAt: "2026-08-11T20:15:00Z", outcome: "complete" as const,
      surface: "signed_in_timeline" as const, status: "active" as const,
      nextCheckAt: "2026-08-20T00:00:00Z", reasonCodes: ["recent_high_activity"],
      coverage: {
        reachedPreviousCursor: true, originalPostsInspected: 1,
        newestPostId: "110", newestPublishedAt: "2026-08-11T20:10:00Z", oldestPostId: "100",
      },
      hits: [{
        canonicalUrl: "https://x.com/work/status/110", title: "new", contentHash: null,
        outcome: "seen" as const, metadata: { platformObjectId: "110" },
      }],
    };
    const records = await memoryRecordsForResults(campaign, [result]);
    expect(records[0].cursor).toMatchObject({ committedPostId: "110", lastSurface: "signed_in_timeline" });
    expect(records[0].nextSearchAt).toBe("2026-08-12T20:15:00.000Z");
    completeCampaignResults(campaign, [result], new Date("2026-08-11T20:16:00Z"));
    expect(campaign.queries[0].state).toBe("completed");
  });

  test("keeps partial timeline work resumable instead of claiming completion", async () => {
    const timeline = {
      ...query("timeline"), operation: "timeline_scan" as const, stage: "official" as const,
      maxFreshHours: 24, cursor: { committedPostId: "100" }, socialAuditEligible: true,
      completionPolicy: {
        allowedCompleteSurfaces: ["signed_in_timeline"] as const,
        mustReachPreviousCursor: true, recordEveryOriginal: true, searchEngineCanComplete: false,
      },
    } satisfies DiscoveryQuery;
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 1, queries: [timeline],
    });
    leaseCampaignQueries(campaign, 1, new Date("2026-08-11T20:00:00Z"));
    const result = {
      queryId: "timeline", searchedAt: "2026-08-11T20:15:00Z", outcome: "partial" as const,
      surface: "public_embed" as const, status: "active" as const,
      coverage: {
        reachedPreviousCursor: false, originalPostsInspected: 1, resumeCursor: { page: 2 },
      },
      hits: [{
        canonicalUrl: "https://x.com/work/status/110", title: "new", contentHash: null,
        outcome: "seen" as const, metadata: { platformObjectId: "110" },
      }],
    };
    const records = await memoryRecordsForResults(campaign, [result]);
    expect(records[0].cursor).toMatchObject({ committedPostId: "100", resume: { page: 2 } });
    completeCampaignResults(campaign, [result], new Date("2026-08-11T20:16:00Z"));
    expect(campaign.queries[0].state).toBe("pending");
  });

  test("persists verified discovery terms for later tag scans", async () => {
    const tag = {
      ...query("tags"), operation: "tag_scan" as const, stage: "tags" as const,
      maxFreshHours: 24, socialAuditEligible: true,
      completionPolicy: {
        allowedCompleteSurfaces: ["signed_in_search"] as const,
        mustReachPreviousCursor: true, recordEveryOriginal: true, searchEngineCanComplete: false,
      },
    } satisfies DiscoveryQuery;
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 1, queries: [tag],
    });
    leaseCampaignQueries(campaign, 1, new Date("2026-08-11T20:00:00Z"));
    const result = {
      queryId: "tags", searchedAt: "2026-08-11T20:15:00Z", outcome: "complete" as const,
      surface: "signed_in_search" as const, status: "active" as const,
      nextCheckAt: "2026-08-12T08:00:00Z", reasonCodes: ["new_term_found"],
      discoveredTerms: [{
        term: "#NewOfficialTag", kind: "official_tag" as const,
        sourceUrl: "https://x.com/work/status/110",
      }],
      coverage: { reachedPreviousCursor: true, originalPostsInspected: 1 },
      hits: [{
        canonicalUrl: "https://x.com/work/status/110", title: "new", contentHash: null,
        outcome: "seen" as const, metadata: { platformObjectId: "110" },
      }],
    };
    const records = await memoryRecordsForResults(campaign, [result]);
    expect(records[0].cursor).toMatchObject({ activeTerms: ["#NewOfficialTag"] });
  });

  test("requires the agent to choose the next check for completed active work", async () => {
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 1, queries: [query("q1")],
    });
    leaseCampaignQueries(campaign, 1, new Date("2026-08-11T20:00:00Z"));

    await expect(memoryRecordsForResults(campaign, [{
      queryId: "q1", searchedAt: "2026-08-11T20:15:00Z", status: "active",
      outcome: "complete", hits: [],
    }])).rejects.toThrow("must choose nextCheckAt");
  });

  test("flags an all-zero official timeline sweep for operator attention", () => {
    const timelines = ["a", "b", "c"].map((id) => ({
      ...query(id), operation: "timeline_scan" as const, stage: "official" as const,
      contentLane: "official" as const, state: "completed" as const,
      cursor: { lastOriginalPostsInspected: 0 }, socialAuditEligible: true,
      completionPolicy: {
        allowedCompleteSurfaces: ["signed_in_timeline"],
        mustReachPreviousCursor: true, recordEveryOriginal: true, searchEngineCanComplete: false,
      } satisfies DiscoveryQuery["completionPolicy"],
      attemptCount: 1, leaseUntil: null, completedAt: "2026-08-11T20:00:00Z",
    }));
    const campaign = createCampaign({
      createdAt: "2026-08-11T20:00:00Z", force: false,
      season: { id: "season-1", slug: "2026-summer", label: "2026 夏" },
      queryBudget: 3, queries: timelines,
    });
    campaign.queries = timelines;
    expect(campaignCompletionAudit(campaign).anomalies)
      .toContain("all_completed_official_timelines_reported_zero_originals");
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
