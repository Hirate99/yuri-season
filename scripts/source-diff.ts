import { fetchSource } from "~/research/source-fetcher";
import { normalizerVersion } from "~/research/connectors/normalize";
import { adminSourceRecord } from "./lib/admin-source-record";
import { fetchAdminDashboard } from "./lib/admin-dashboard";
import { localSourceTransport } from "./lib/local-source-transport";
import { sourceChangeKind, type SourceChange } from "./lib/source-change";
import {
  mergeSourceBacklog,
  resolveSourceBacklog,
  type SourceBacklog,
  type SourceResolution,
} from "./lib/source-backlog";
import { readResearchJson, writeResearchJson } from "./lib/research-cache";
import { changedItems, isReusableSourceState } from "./lib/source-state";
import { isRoutineUpdateSource, rotatingSourceSelection } from "./lib/source-selection";

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

async function loadCache(): Promise<{ pending: SourceBacklog | null; current: CacheState }> {
  let pending = await readResearchJson<SourceBacklog | null>(diffPath, null);
  const hasProposed = Boolean(pending && (await Bun.file(proposedPath).exists()));
  // Migrate the old proposed baseline without acknowledging any unresolved content.
  const current = await readResearchJson<CacheState>(hasProposed ? proposedPath : statePath, {
    version: 3,
    sources: {},
  });
  if (pending && (pending.schemaVersion === 2 || hasProposed)) {
    pending = mergeSourceBacklog(pending, [], [], [], new Date().toISOString());
    await writeResearchJson(diffPath, pending);
    await writeResearchJson(statePath, current);
    if (hasProposed) await Bun.file(proposedPath).delete();
  }
  return { pending, current };
}

async function check(): Promise<void> {
  const { pending, current } = await loadCache();

  const next: CacheState = {
    version: 3,
    sources: structuredClone(current.sources),
    sourceCursor: current.sourceCursor,
  };

  const data = await fetchAdminDashboard();
  const changes: SourceChange[] = [];
  const errors: Array<{ sourceId: string; message: string }> = [];

  const budget = Number(process.env.YURI_SOURCE_LIMIT ?? "") || Infinity;

  const profile = process.argv
    .find((argument) => argument.startsWith("--profile="))
    ?.slice("--profile=".length);

  if (profile && profile !== "routine")
    throw new Error("source-diff --profile only supports routine");

  const eligibleSources =
    profile === "routine"
      ? data.sources.filter(isRoutineUpdateSource)
      : data.sources.filter((item) => item.enabled);

  const selection = rotatingSourceSelection(eligibleSources, current.sourceCursor, budget);

  next.sourceCursor = selection.cursor;

  for (const source of selection.selected) {
    const previous = current.sources[source.id];

    try {
      const version = normalizerVersion({ sourceType: source.sourceType });
      const canReusePrevious = isReusableSourceState(previous, source.sourceType, version);
      const reusablePrevious = canReusePrevious ? previous : undefined;
      const record = adminSourceRecord(source, reusablePrevious);
      const fetched = await fetchSource(record, localSourceTransport);
      const changed = changedItems(reusablePrevious?.hashes, fetched.items);

      changes.push(
        ...changed.map((item) => ({
          kind: sourceChangeKind(source.changeKind, source.sourceType),
          sourceId: source.id,
          sourceType: source.sourceType,
          animeTitle: source.animeTitle,
          sourceLabel: source.label,
          trustLevel: source.trustLevel,
          item,
        })),
      );
      next.sources[source.id] = {
        etag: fetched.etag ?? reusablePrevious?.etag ?? null,
        lastModified: fetched.lastModified ?? reusablePrevious?.lastModified ?? null,
        hashes:
          fetched.status === 304
            ? (reusablePrevious?.hashes ?? [])
            : fetched.items.map((item) => item.contentHash).slice(0, 200),
        normalizerVersion: version,
      };
    } catch (error) {
      errors.push({
        sourceId: source.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const backlog = mergeSourceBacklog(
    pending,
    changes,
    errors,
    selection.selected.map((source) => source.id),
    new Date().toISOString(),
  );
  // Persist evidence before advancing the fetch baseline. A crash can repeat detection,
  // but mergeSourceBacklog will deduplicate it without losing unresolved versions.
  await writeResearchJson(diffPath, backlog);
  await writeResearchJson(statePath, next);
  if (await Bun.file(proposedPath).exists()) await Bun.file(proposedPath).delete();
  process.stdout.write(
    JSON.stringify(
      {
        profile: profile ?? "all-enabled",
        changes: changes.length,
        checkedSources: selection.selected.length,
        remainingSources: selection.remaining,
        catalogChanges: backlog.catalogChanges.length,
        feedChanges: backlog.feedChanges.length,
        errors: backlog.errors,
        path: diffPath,
      },
      null,
      2,
    ),
  );
}

async function commit(): Promise<void> {
  const path = process.argv[3];
  if (!path)
    throw new Error(
      "usage: research:commit <resolutions.json>; whole-diff commit/discard is no longer supported",
    );
  const { pending: backlog } = await loadCache();
  if (!backlog) throw new Error("no source backlog; run research:diff first");
  const { resolutions } = (await Bun.file(path).json()) as { resolutions: SourceResolution[] };
  if (!Array.isArray(resolutions)) throw new Error("resolutions array is required");
  const next = resolveSourceBacklog(backlog, resolutions);
  const remaining = new Set([...next.catalogChanges, ...next.feedChanges]);
  const archive = `${cacheDirectory}/source-resolutions/${Date.now()}-${crypto.randomUUID()}.json`;
  await writeResearchJson(archive, {
    resolvedAt: new Date().toISOString(),
    resolutions,
    changes: [...backlog.catalogChanges, ...backlog.feedChanges].filter(
      (change) => !remaining.has(change),
    ),
  });
  await writeResearchJson(diffPath, next);
  process.stdout.write(
    JSON.stringify(
      {
        resolved: resolutions.length,
        pending: next.catalogChanges.length + next.feedChanges.length,
        archive,
      },
      null,
      2,
    ),
  );
}

const mode = process.argv[2] ?? "check";

if (mode !== "check" && mode !== "commit") throw new Error(`unknown source diff mode: ${mode}`);

await (mode === "commit" ? commit() : check());
