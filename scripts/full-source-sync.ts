import { fetchSource } from "~/research/source-fetcher";
import { adminSourceRecord } from "./lib/admin-source-record";
import { fetchAdminDashboard } from "./lib/admin-dashboard";
import {
  searchRecords,
  sourceChecks,
  type FullSyncResult,
  type FullSyncSource,
} from "./lib/full-source-records";
import { localSourceTransport } from "./lib/local-source-transport";
import { mapConcurrent } from "./lib/map-concurrent";
import { keyedSerial } from "./lib/keyed-serial";
import { rememberSearchRecords } from "./lib/search-memory-client";
import { submitSourceChecks } from "./lib/source-check-client";

const outputPath = ".research-cache/full-source-sync.json";
const recordOnly = process.argv.includes("--record-only");
let checkedSources = 0;
let result: FullSyncResult;
if (recordOnly) {
  const cached = Bun.file(outputPath);
  if (!await cached.exists()) throw new Error(`${outputPath} is missing`);
  result = await cached.json() as FullSyncResult;
  checkedSources = result.sources.length + result.errors.length;
} else {
  const dashboard = await fetchAdminDashboard();
  const sources = dashboard.sources.filter((source) => source.enabled);
  const errors: FullSyncResult["errors"] = [];
  const byHostname = keyedSerial();
  const synced = await mapConcurrent(sources, 4, async (source): Promise<FullSyncSource | null> => {
    try {
      const fetched = await byHostname(new URL(source.url).hostname, () =>
        fetchSource(adminSourceRecord(source), localSourceTransport));
      return {
        sourceId: source.id, animeTitle: source.animeTitle, sourceLabel: source.label,
        sourceType: source.sourceType, changeKind: source.changeKind, trustLevel: source.trustLevel,
        url: source.url, items: fetched.items, etag: fetched.etag, lastModified: fetched.lastModified,
      };
    } catch (error) {
      errors.push({ sourceId: source.id, message: error instanceof Error ? error.message : String(error) });
      return null;
    }
  });
  result = {
    schemaVersion: 1, createdAt: new Date().toISOString(), mode: "registered-source-full-sync",
    sources: synced.filter((source): source is FullSyncSource => source !== null), errors,
  };
  checkedSources = sources.length;
  await Bun.write(outputPath, JSON.stringify(result, null, 2));
}

let memory: { records: number; hits: number } | null = null;
let health: { received: number; updated: number } | null = null;
if (process.argv.includes("--remember") || recordOnly) {
  health = await submitSourceChecks(sourceChecks(result));
  memory = await rememberSearchRecords(await searchRecords(result));
}

process.stdout.write(JSON.stringify({
  checkedSources,
  successfulSources: result.sources.length,
  items: result.sources.reduce((total, source) => total + source.items.length, 0),
  errors: result.errors,
  path: outputPath,
  health,
  memory,
}, null, 2));
