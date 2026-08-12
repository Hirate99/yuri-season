import { fetchSource } from "../worker/research/source-fetcher";
import { normalizerVersion } from "../worker/research/connectors/normalize";
import { adminSourceRecord } from "./lib/admin-source-record";
import { fetchAdminDashboard } from "./lib/admin-dashboard";
import { localSourceTransport } from "./lib/local-source-transport";
import {
  partitionSourceChanges,
  sourceChangeKind,
  type SourceChange,
} from "./lib/source-change";
import { changedItems, isReusableSourceState } from "./lib/source-state";
import { rotatingSourceSelection } from "./lib/source-selection";

type SourceState = {
  etag: string | null;
  lastModified: string | null;
  hashes: string[];
  normalizerVersion?: string;
};

type CacheState = {
  version: number;
  sources: Record<string, SourceState>;
  sourceCursor?: string;
};

const cacheDirectory = ".research-cache";
const statePath = `${cacheDirectory}/source-state.json`;
const proposedPath = `${cacheDirectory}/proposed-state.json`;
const diffPath = `${cacheDirectory}/pending-diff.json`;

async function readJson<T>(path: string, fallback: T): Promise<T> {
  const file = Bun.file(path);
  return await file.exists() ? file.json() as Promise<T> : fallback;
}

async function check(): Promise<void> {
  const pending = Bun.file(diffPath);
  if (await pending.exists()) throw new Error("pending-diff.json already exists; ingest and commit it before checking again");
  const current = await readJson<CacheState>(statePath, { version: 2, sources: {} });
  const next: CacheState = { version: 3, sources: structuredClone(current.sources), sourceCursor: current.sourceCursor };
  const data = await fetchAdminDashboard();
  const changes: SourceChange[] = [];
  const errors: Array<{ sourceId: string; message: string }> = [];

  const budget = Math.min(20, Math.max(1, Number(process.env.YURI_SOURCE_LIMIT ?? 20) || 20));
  const selection = rotatingSourceSelection(data.sources.filter((item) => item.enabled), current.sourceCursor, budget);
  next.sourceCursor = selection.cursor;
  for (const source of selection.selected) {
    const previous = current.sources[source.id];
    try {
      const version = normalizerVersion({ source_type: source.sourceType });
      const canReusePrevious = isReusableSourceState(previous, source.sourceType, version);
      const reusablePrevious = canReusePrevious ? previous : undefined;
      const record = adminSourceRecord(source, reusablePrevious);
      const fetched = await fetchSource(record, localSourceTransport);
      const changed = changedItems(reusablePrevious?.hashes, fetched.items);
      changes.push(...changed.map((item) => ({
        kind: sourceChangeKind(source.changeKind, source.sourceType),
        sourceId: source.id,
        sourceType: source.sourceType,
        animeTitle: source.animeTitle,
        sourceLabel: source.label,
        trustLevel: source.trustLevel,
        item,
      })));
      next.sources[source.id] = {
        etag: fetched.etag ?? reusablePrevious?.etag ?? null,
        lastModified: fetched.lastModified ?? reusablePrevious?.lastModified ?? null,
        hashes: fetched.status === 304 ? reusablePrevious?.hashes ?? [] : fetched.items.map((item) => item.contentHash).slice(0, 200),
        normalizerVersion: version,
      };
    } catch (error) {
      errors.push({ sourceId: source.id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  await Bun.write(proposedPath, JSON.stringify(next, null, 2));
  if (changes.length === 0) {
    await Bun.write(statePath, JSON.stringify(next, null, 2));
    await Bun.file(proposedPath).delete();
    process.stdout.write(JSON.stringify({
      baseline: Object.keys(current.sources).length === 0,
      checkedSources: selection.selected.length,
      remainingSources: selection.remaining,
      changes: 0,
      errors,
    }, null, 2));
    return;
  }
  const { catalogChanges, feedChanges } = partitionSourceChanges(changes);
  await Bun.write(diffPath, JSON.stringify({
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    catalogChanges,
    feedChanges,
    errors,
  }, null, 2));
  process.stdout.write(JSON.stringify({
    changes: changes.length,
    checkedSources: selection.selected.length,
    remainingSources: selection.remaining,
    catalogChanges: catalogChanges.length,
    feedChanges: feedChanges.length,
    errors,
    path: diffPath,
  }, null, 2));
}

async function commit(): Promise<void> {
  const proposed = Bun.file(proposedPath);
  if (!await proposed.exists()) throw new Error("no proposed state to commit");
  await Bun.write(statePath, await proposed.text());
  if (await Bun.file(diffPath).exists()) await Bun.file(diffPath).delete();
  await proposed.delete();
  process.stdout.write("research diff committed\n");
}

async function discard(): Promise<void> {
  let removed = 0;
  for (const path of [proposedPath, diffPath]) {
    const file = Bun.file(path);
    if (!await file.exists()) continue;
    await file.delete();
    removed += 1;
  }
  process.stdout.write(`discarded ${removed} pending research file(s)\n`);
}

const mode = process.argv[2] ?? "check";
if (!new Set(["check", "commit", "discard"]).has(mode)) throw new Error(`unknown source diff mode: ${mode}`);
await (mode === "commit" ? commit() : mode === "discard" ? discard() : check());
