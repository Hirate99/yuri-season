import { mkdir } from "node:fs/promises";
import type { DiscoveryResult } from "./lib/discovery-campaign";
import {
  cancelCampaignQueries,
  campaignSummary,
  completeCampaignResults,
  leaseCampaignQueries,
  memoryRecordsForResults,
  type DiscoveryCampaign,
} from "./lib/discovery-campaign";
import { rememberSearchRecords } from "./lib/search-memory-client";

const campaignPath = ".research-cache/discovery-plan.json";
const resultsDirectory = ".research-cache/discovery-results";

async function loadCampaign(): Promise<DiscoveryCampaign> {
  const file = Bun.file(campaignPath);
  if (!await file.exists()) throw new Error("run research:discover before leasing queries");
  const campaign = await file.json() as DiscoveryCampaign;
  if (campaign.schemaVersion !== 2 || campaign.mode !== "discovery-campaign") {
    throw new Error("discovery plan is from an older version; regenerate it with --replace");
  }
  return campaign;
}

async function saveCampaign(campaign: DiscoveryCampaign): Promise<void> {
  await Bun.write(campaignPath, JSON.stringify(campaign, null, 2));
}

function batchLimit(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? "4", 10);
  if (!Number.isInteger(value) || value < 1 || value > 12) throw new Error("batch size must be 1-12");
  return value;
}

async function lease(): Promise<void> {
  const campaign = await loadCampaign();
  const queries = leaseCampaignQueries(campaign, batchLimit(process.argv[3]), new Date());
  await saveCampaign(campaign);
  process.stdout.write(JSON.stringify({
    campaignId: campaign.campaignId,
    leaseUntil: queries[0]?.leaseUntil ?? null,
    queries,
    remaining: campaignSummary(campaign),
  }, null, 2));
}

async function record(path: string | undefined): Promise<void> {
  if (!path) throw new Error("result JSON path is required");
  const campaign = await loadCampaign();
  const input = await Bun.file(path).json() as { campaignId: string; results: DiscoveryResult[] };
  if (input.campaignId !== campaign.campaignId) throw new Error("result campaignId does not match active campaign");
  if (!Array.isArray(input.results) || input.results.length < 1 || input.results.length > 12) {
    throw new Error("results must contain 1-12 entries");
  }
  const memory = await rememberSearchRecords(await memoryRecordsForResults(campaign, input.results));
  completeCampaignResults(campaign, input.results, new Date());
  await saveCampaign(campaign);
  await mkdir(resultsDirectory, { recursive: true });
  const archive = `${resultsDirectory}/${campaign.campaignId}-${Date.now()}.json`;
  await Bun.write(archive, JSON.stringify(input, null, 2));
  process.stdout.write(JSON.stringify({ memory, archive, ...campaignSummary(campaign) }, null, 2));
}

async function cancel(scopeType: string | undefined, scopeId: string | undefined, reason: string | undefined): Promise<void> {
  if (!scopeType || !scopeId) throw new Error("scope type and scope id are required");
  const campaign = await loadCampaign();
  const cancelled = cancelCampaignQueries(
    campaign,
    scopeType,
    scopeId,
    reason?.trim() || "scope removed",
    new Date(),
  );
  if (cancelled === 0) throw new Error(`no unfinished queries matched ${scopeType}:${scopeId}`);
  await saveCampaign(campaign);
  process.stdout.write(JSON.stringify({ cancelled, ...campaignSummary(campaign) }, null, 2));
}

const command = process.argv[2] ?? "status";
if (command === "next") await lease();
else if (command === "record") await record(process.argv[3]);
else if (command === "cancel") await cancel(process.argv[3], process.argv[4], process.argv.slice(5).join(" "));
else if (command === "status") process.stdout.write(JSON.stringify(campaignSummary(await loadCampaign()), null, 2));
else throw new Error(`unknown discovery campaign command: ${command}`);
