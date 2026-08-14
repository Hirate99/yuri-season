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
  const value = raw === undefined ? Number.MAX_SAFE_INTEGER : Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) throw new Error("batch size must be a positive integer");
  return value;
}

function optionValues(arguments_: string[], name: string): Set<string> | null {
  const prefix = `--${name}=`;
  const raw = arguments_.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  const values = raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (values.length === 0) throw new Error(`${prefix}<comma-separated values> expected`);
  return new Set(values);
}

function optionValue(arguments_: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const raw = arguments_.find((argument) => argument.startsWith(prefix))?.slice(prefix.length).trim();
  if (raw === undefined) return null;
  if (!raw) throw new Error(`${prefix}<value> expected`);
  return raw;
}

async function lease(): Promise<void> {
  const campaign = await loadCampaign();
  const arguments_ = process.argv.slice(3);
  const positionalLimit = arguments_.find((argument) => !argument.startsWith("--"));
  const platforms = optionValues(arguments_, "platform");
  const kinds = optionValues(arguments_, "kind");
  const targetSuffix = optionValue(arguments_, "target-suffix");
  const queries = leaseCampaignQueries(campaign, batchLimit(positionalLimit), new Date(), (query) =>
    (!platforms || Boolean(query.platform && platforms.has(query.platform.toLowerCase())))
    && (!kinds || kinds.has(query.searchKind.toLowerCase()))
    && (!targetSuffix || query.targetKey.endsWith(targetSuffix)));
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
  if (!Array.isArray(input.results) || input.results.length < 1) {
    throw new Error("results must contain at least one entry");
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
  const cancelledNow = cancelCampaignQueries(
    campaign,
    scopeType,
    scopeId,
    reason?.trim() || "scope removed",
    new Date(),
  );
  if (cancelledNow === 0) throw new Error(`no unfinished queries matched ${scopeType}:${scopeId}`);
  await saveCampaign(campaign);
  process.stdout.write(JSON.stringify({ ...campaignSummary(campaign), cancelledNow }, null, 2));
}

const command = process.argv[2] ?? "status";
if (command === "next") await lease();
else if (command === "record") await record(process.argv[3]);
else if (command === "cancel") await cancel(process.argv[3], process.argv[4], process.argv.slice(5).join(" "));
else if (command === "status") process.stdout.write(JSON.stringify(campaignSummary(await loadCampaign()), null, 2));
else throw new Error(`unknown discovery campaign command: ${command}`);
