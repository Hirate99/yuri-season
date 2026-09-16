import { createHash } from "node:crypto";
import { partitionSourceChanges, type SourceChange } from "./source-change";

export type PendingSourceChange = SourceChange & { changeId: string };
export type SourceBacklog = {
  schemaVersion: number;
  createdAt: string;
  catalogChanges: SourceChange[];
  feedChanges: SourceChange[];
  errors: Array<{ sourceId: string; message: string }>;
};

export type SourceResolution = {
  changeId: string;
  outcome: "published" | "covered" | "ignored";
  reason: string;
  evidenceUrls?: string[];
};

// Identity includes the version: resolving an old announcement cannot remove an update.
export function sourceChangeId(change: SourceChange): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        change.sourceId,
        change.item.sourceItemId ?? change.item.canonicalUrl,
        change.item.contentHash,
      ]),
    )
    .digest("hex");
}

export function mergeSourceBacklog(
  previous: SourceBacklog | null,
  changes: SourceChange[],
  errors: SourceBacklog["errors"],
  checkedSourceIds: string[],
  now: string,
): SourceBacklog {
  const items = new Map<string, PendingSourceChange>();
  for (const change of [
    ...(previous?.catalogChanges ?? []),
    ...(previous?.feedChanges ?? []),
    ...changes,
  ]) {
    const changeId = sourceChangeId(change);
    items.set(changeId, { ...change, changeId });
  }
  const checked = new Set(checkedSourceIds);
  return {
    schemaVersion: 3,
    createdAt: previous?.createdAt ?? now,
    ...partitionSourceChanges([...items.values()]),
    errors: [
      ...(previous?.errors ?? []).filter((error) => !checked.has(error.sourceId)),
      ...errors,
    ],
  };
}

export function resolveSourceBacklog(
  backlog: SourceBacklog,
  resolutions: SourceResolution[],
): SourceBacklog {
  if (!resolutions.length) throw new Error("resolutions must contain at least one reviewed change");
  const pending = new Set([...backlog.catalogChanges, ...backlog.feedChanges].map(sourceChangeId));
  const resolved = new Set<string>();
  for (const resolution of resolutions) {
    if (!pending.has(resolution.changeId))
      throw new Error(`unknown changeId: ${resolution.changeId}`);
    if (resolved.has(resolution.changeId))
      throw new Error(`duplicate changeId: ${resolution.changeId}`);
    if (
      !["published", "covered", "ignored"].includes(resolution.outcome) ||
      !resolution.reason?.trim()
    ) {
      throw new Error("each resolution requires an outcome and an editorial reason");
    }
    if (resolution.outcome !== "ignored" && !resolution.evidenceUrls?.length) {
      throw new Error("published/covered resolutions require public readback evidenceUrls");
    }
    for (const value of resolution.evidenceUrls ?? []) {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol))
        throw new Error("evidenceUrls must be HTTP(S)");
    }
    resolved.add(resolution.changeId);
  }
  return {
    ...backlog,
    catalogChanges: backlog.catalogChanges.filter(
      (change) => !resolved.has(sourceChangeId(change)),
    ),
    feedChanges: backlog.feedChanges.filter((change) => !resolved.has(sourceChangeId(change))),
  };
}
