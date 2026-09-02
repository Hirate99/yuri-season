import type { SearchMemoryWrite } from "@/domain";
import { stableFingerprint } from "~/shared/fingerprint";
import type { DiscoveryQuery, DiscoverySurface } from "./discovery-query-plan";
import type { ResearchProfile } from "./research-profile";

export type CampaignQuery = DiscoveryQuery & {
  state: "pending" | "leased" | "completed" | "blocked" | "cancelled";
  attemptCount: number;
  leaseUntil: string | null;
  completedAt: string | null;
  cancellationReason?: string | null;
};

export type DiscoveryCampaign = {
  schemaVersion: 3;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
  mode: "discovery-campaign";
  profile?: ResearchProfile;
  force: boolean;
  season: { id: string; slug: string; label: string };
  queryBudget: number;
  queries: CampaignQuery[];
};

export type DiscoveryResult = {
  queryId: string;
  searchedAt: string;
  outcome: "complete" | "partial" | "blocked";
  surface?: DiscoverySurface | null;
  status: SearchMemoryWrite["status"];
  nextCheckAt?: string | null;
  reasonCodes?: string[];
  discoveredTerms?: Array<{
    term: string;
    kind: "official_tag" | "project_tag" | "unit" | "character" | "pair" | "alias";
    sourceUrl: string;
  }>;
  coverage?: {
    reachedPreviousCursor: boolean;
    originalPostsInspected: number;
    repostsInspected?: number;
    newestPostId?: string | null;
    newestPublishedAt?: string | null;
    oldestPostId?: string | null;
    oldestPublishedAt?: string | null;
    resumeCursor?: Record<string, unknown>;
  } | null;
  notes?: string | null;
  hits: SearchMemoryWrite["hits"];
};

export function createCampaign(input: Omit<DiscoveryCampaign, "schemaVersion" | "campaignId" | "updatedAt" | "mode" | "queries"> & {
  queries: DiscoveryQuery[];
}): DiscoveryCampaign {
  return {
    ...input,
    schemaVersion: 3,
    campaignId: `discovery-${crypto.randomUUID()}`,
    updatedAt: input.createdAt,
    mode: "discovery-campaign",
    queries: input.queries.map((query) => ({
      ...query, state: "pending", attemptCount: 0, leaseUntil: null, completedAt: null,
    })),
  };
}

export function hasUnfinishedQueries(campaign: DiscoveryCampaign): boolean {
  return campaign.queries.some((query) => query.state === "pending" || query.state === "leased");
}

function validTimestamp(value: string | null | undefined): value is string {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

function validateResult(query: CampaignQuery, result: DiscoveryResult): void {
  if (query.state !== "leased") throw new Error(`query ${result.queryId} is not leased`);
  if (!validTimestamp(result.searchedAt)) throw new Error(`invalid searchedAt for ${result.queryId}`);
  if (result.nextCheckAt != null && !validTimestamp(result.nextCheckAt)) {
    throw new Error(`invalid nextCheckAt for ${result.queryId}`);
  }
  if (result.outcome === "blocked" && result.status !== "blocked") {
    throw new Error(`blocked result ${result.queryId} must use blocked status`);
  }
  if (result.outcome !== "blocked" && result.status === "blocked") {
    throw new Error(`non-blocked result ${result.queryId} cannot use blocked status`);
  }
  if (result.outcome === "complete" && result.status !== "exhausted"
    && !validTimestamp(result.nextCheckAt)) {
    throw new Error(`complete result ${result.queryId} must choose nextCheckAt`);
  }
  if ((result.discoveredTerms?.length ?? 0) > 100) {
    throw new Error(`too many discoveredTerms for ${result.queryId}`);
  }
  for (const term of result.discoveredTerms ?? []) {
    if (!term.term.trim()) throw new Error(`empty discovered term for ${result.queryId}`);
    try {
      const url = new URL(term.sourceUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      throw new Error(`invalid discovered term sourceUrl for ${result.queryId}`);
    }
  }
  if (result.outcome !== "complete" || query.operation === "search") return;

  if (!result.surface) throw new Error(`${query.operation} ${result.queryId} requires a surface`);
  if (!query.completionPolicy.searchEngineCanComplete && result.surface === "search_engine") {
    throw new Error(`search_engine cannot complete ${query.operation} ${result.queryId}`);
  }
  if (query.completionPolicy.allowedCompleteSurfaces.length > 0
    && !query.completionPolicy.allowedCompleteSurfaces.includes(result.surface)) {
    throw new Error(`${result.surface} cannot complete ${query.operation} ${result.queryId}`);
  }
  const coverage = result.coverage;
  if (!coverage) throw new Error(`${query.operation} ${result.queryId} requires coverage`);
  if (!Number.isInteger(coverage.originalPostsInspected) || coverage.originalPostsInspected < 0) {
    throw new Error(`invalid originalPostsInspected for ${result.queryId}`);
  }
  if (query.completionPolicy.mustReachPreviousCursor && !coverage.reachedPreviousCursor) {
    throw new Error(`${query.operation} ${result.queryId} did not reach the previous cursor`);
  }
  if (query.completionPolicy.recordEveryOriginal) {
    const stableHits = result.hits.filter((hit) =>
      typeof hit.metadata?.platformObjectId === "string" && hit.metadata.platformObjectId.length > 0);
    if (stableHits.length < coverage.originalPostsInspected) {
      throw new Error(`${query.operation} ${result.queryId} must record every inspected original with a stable platformObjectId`);
    }
  }
}

function cursorForResult(query: CampaignQuery, result: DiscoveryResult): Record<string, unknown> {
  const prior = query.cursor ?? {};
  if (result.outcome === "partial") {
    return {
      ...prior,
      resume: result.coverage?.resumeCursor ?? null,
      lastPartialAt: new Date(result.searchedAt).toISOString(),
      lastSurface: result.surface ?? null,
    };
  }
  if (result.outcome !== "complete" || query.operation === "search") return prior;
  const committed = {
    ...prior,
    committedPostId: result.coverage?.newestPostId ?? prior.committedPostId ?? null,
    committedPublishedAt: result.coverage?.newestPublishedAt ?? prior.committedPublishedAt ?? null,
    completedAt: new Date(result.searchedAt).toISOString(),
    lastSurface: result.surface ?? null,
    lastOriginalPostsInspected: result.coverage?.originalPostsInspected ?? 0,
    lastUsefulHits: result.hits.filter((hit) => !["seen", "ignored", "rejected"].includes(hit.outcome)).length,
    resume: null,
  };
  if (query.operation !== "tag_scan" || !result.discoveredTerms?.length) return committed;
  return {
    ...committed,
    activeTerms: [...new Set(result.discoveredTerms.map((item) => item.term.trim()).filter(Boolean))].slice(0, 50),
    termEvidence: result.discoveredTerms.slice(0, 50),
  };
}

function nextSearchAt(query: CampaignQuery, result: DiscoveryResult): string {
  const searched = Date.parse(result.searchedAt);
  if (result.outcome === "partial") return new Date(searched).toISOString();
  const latestAllowed = searched + query.maxFreshHours * 60 * 60_000;
  const requested = validTimestamp(result.nextCheckAt) ? Date.parse(result.nextCheckAt) : latestAllowed;
  return new Date(Math.max(searched, Math.min(requested, latestAllowed))).toISOString();
}

export function cancelCampaignQueries(
  campaign: DiscoveryCampaign,
  scopeType: string,
  scopeId: string,
  reason: string,
  now: Date,
): number {
  const matches = campaign.queries.filter((query) =>
    query.scopeType === scopeType
    && query.scopeId === scopeId
    && (query.state === "pending" || query.state === "leased"));
  for (const query of matches) {
    query.state = "cancelled";
    query.leaseUntil = null;
    query.completedAt = now.toISOString();
    query.cancellationReason = reason;
  }
  if (matches.length > 0) campaign.updatedAt = now.toISOString();
  return matches.length;
}

export function recoverExpiredCampaignQueries(campaign: DiscoveryCampaign, now: Date): number {
  let recovered = 0;
  for (const query of campaign.queries) {
    if (query.state === "leased" && query.leaseUntil && Date.parse(query.leaseUntil) <= now.valueOf()) {
      query.state = "pending";
      query.leaseUntil = null;
      recovered += 1;
    }
  }
  if (recovered > 0) campaign.updatedAt = now.toISOString();
  return recovered;
}

export function leaseCampaignQueries(
  campaign: DiscoveryCampaign,
  limit: number,
  now: Date,
  matches: (query: CampaignQuery) => boolean = () => true,
): CampaignQuery[] {
  recoverExpiredCampaignQueries(campaign, now);
  const leaseUntil = new Date(now.valueOf() + 2 * 60 * 60_000).toISOString();
  const leased = campaign.queries
    .filter((query) => query.state === "pending" && matches(query))
    .slice(0, limit);
  for (const query of leased) {
    query.state = "leased";
    query.attemptCount += 1;
    query.leaseUntil = leaseUntil;
  }
  campaign.updatedAt = now.toISOString();
  return leased;
}

export async function memoryRecordsForResults(
  campaign: DiscoveryCampaign,
  results: DiscoveryResult[],
): Promise<SearchMemoryWrite[]> {
  const resultIds = new Set<string>();
  return Promise.all(results.map(async (result) => {
    if (resultIds.has(result.queryId)) throw new Error(`duplicate query result ${result.queryId}`);
    resultIds.add(result.queryId);
    const query = campaign.queries.find((item) => item.id === result.queryId);
    if (!query) throw new Error(`unknown campaign query ${result.queryId}`);
    validateResult(query, result);
    const hitKey = result.hits.map((hit) => `${hit.canonicalUrl}\u0000${hit.contentHash ?? ""}`).sort().join("\u0001");
    const useful = result.hits.filter((hit) => !["seen", "ignored", "rejected"].includes(hit.outcome)).length;
    return {
      scopeType: query.scopeType,
      scopeId: query.scopeId,
      searchKind: query.searchKind,
      targetKey: query.targetKey,
      queryText: query.queryText,
      status: result.status,
      cursor: cursorForResult(query, result),
      lastResultHash: await stableFingerprint(hitKey),
      lastResultCount: result.hits.length,
      usefulResultCount: useful,
      searchedAt: new Date(result.searchedAt).toISOString(),
      nextSearchAt: nextSearchAt(query, result),
      notes: [result.notes, result.reasonCodes?.length ? `schedule:${result.reasonCodes.join(",")}` : null]
        .filter(Boolean).join(" | ") || null,
      hits: result.hits,
    };
  }));
}

export function completeCampaignResults(
  campaign: DiscoveryCampaign,
  results: DiscoveryResult[],
  now: Date,
): void {
  for (const result of results) {
    const query = campaign.queries.find((item) => item.id === result.queryId);
    if (!query) throw new Error(`unknown campaign query ${result.queryId}`);
    validateResult(query, result);
    query.cursor = cursorForResult(query, result);
    query.state = result.outcome === "complete" ? "completed"
      : result.outcome === "blocked" ? "blocked" : "pending";
    query.leaseUntil = null;
    query.completedAt = result.outcome === "partial" ? null : new Date(result.searchedAt).toISOString();
  }
  campaign.updatedAt = now.toISOString();
}

export function campaignSummary(campaign: DiscoveryCampaign) {
  const count = (state: CampaignQuery["state"]) => campaign.queries.filter((query) => query.state === state).length;
  return {
    profile: campaign.profile ?? null,
    campaignId: campaign.campaignId,
    season: campaign.season.label,
    total: campaign.queries.length,
    pending: count("pending"),
    leased: count("leased"),
    completed: count("completed"),
    blocked: count("blocked"),
    cancelled: count("cancelled"),
    updatedAt: campaign.updatedAt,
  };
}

export function campaignCompletionAudit(campaign: DiscoveryCampaign) {
  const officialTimelines = campaign.queries.filter((query) =>
    query.operation === "timeline_scan" && query.contentLane === "official");
  const completedOfficial = officialTimelines.filter((query) => query.state === "completed");
  const zeroOriginals = completedOfficial.filter((query) => query.cursor.lastOriginalPostsInspected === 0);
  const anomalies: string[] = [];
  if (completedOfficial.length >= 3 && zeroOriginals.length === completedOfficial.length) {
    anomalies.push("all_completed_official_timelines_reported_zero_originals");
  }
  return {
    officialTimelineTasks: officialTimelines.length,
    completedOfficialTimelines: completedOfficial.length,
    zeroOriginalOfficialTimelines: zeroOriginals.length,
    anomalies,
  };
}
