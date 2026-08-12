import type { SearchMemoryWrite } from "@/domain";
import { stableFingerprint } from "../../worker/lib/fingerprint";
import type { DiscoveryQuery } from "./discovery-query-plan";

export type CampaignQuery = DiscoveryQuery & {
  state: "pending" | "leased" | "completed" | "cancelled";
  attemptCount: number;
  leaseUntil: string | null;
  completedAt: string | null;
  cancellationReason?: string | null;
};

export type DiscoveryCampaign = {
  schemaVersion: 2;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
  mode: "discovery-campaign";
  force: boolean;
  season: { id: string; slug: string; label: string };
  queryBudget: number;
  queries: CampaignQuery[];
};

export type DiscoveryResult = {
  queryId: string;
  searchedAt: string;
  status: SearchMemoryWrite["status"];
  notes?: string | null;
  hits: SearchMemoryWrite["hits"];
};

export function createCampaign(input: Omit<DiscoveryCampaign, "schemaVersion" | "campaignId" | "updatedAt" | "mode" | "queries"> & {
  queries: DiscoveryQuery[];
}): DiscoveryCampaign {
  return {
    ...input,
    schemaVersion: 2,
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

function recoverExpired(campaign: DiscoveryCampaign, now: Date): void {
  for (const query of campaign.queries) {
    if (query.state === "leased" && query.leaseUntil && Date.parse(query.leaseUntil) <= now.valueOf()) {
      query.state = "pending";
      query.leaseUntil = null;
    }
  }
}

export function leaseCampaignQueries(campaign: DiscoveryCampaign, limit: number, now: Date): CampaignQuery[] {
  recoverExpired(campaign, now);
  const leaseUntil = new Date(now.valueOf() + 2 * 60 * 60_000).toISOString();
  const leased = campaign.queries.filter((query) => query.state === "pending").slice(0, limit);
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
    if (query.state === "pending") throw new Error(`query ${result.queryId} is not leased`);
    if (Number.isNaN(Date.parse(result.searchedAt))) throw new Error(`invalid searchedAt for ${result.queryId}`);
    const hitKey = result.hits.map((hit) => `${hit.canonicalUrl}\u0000${hit.contentHash ?? ""}`).sort().join("\u0001");
    const useful = result.hits.filter((hit) => !["seen", "ignored", "rejected"].includes(hit.outcome)).length;
    return {
      scopeType: query.scopeType,
      scopeId: query.scopeId,
      searchKind: query.searchKind,
      targetKey: query.targetKey,
      queryText: query.queryText,
      status: result.status,
      cursor: {},
      lastResultHash: await stableFingerprint(hitKey),
      lastResultCount: result.hits.length,
      usefulResultCount: useful,
      searchedAt: new Date(result.searchedAt).toISOString(),
      nextSearchAt: new Date(Date.parse(result.searchedAt) + query.cadenceDays * 86_400_000).toISOString(),
      notes: result.notes ?? null,
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
    query.state = "completed";
    query.leaseUntil = null;
    query.completedAt = new Date(result.searchedAt).toISOString();
  }
  campaign.updatedAt = now.toISOString();
}

export function campaignSummary(campaign: DiscoveryCampaign) {
  const count = (state: CampaignQuery["state"]) => campaign.queries.filter((query) => query.state === state).length;
  return {
    campaignId: campaign.campaignId,
    season: campaign.season.label,
    total: campaign.queries.length,
    pending: count("pending"),
    leased: count("leased"),
    completed: count("completed"),
    cancelled: count("cancelled"),
    updatedAt: campaign.updatedAt,
  };
}
