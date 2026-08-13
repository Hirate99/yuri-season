import type { NormalizedSource } from "~/research/types";

export type SourceChangeKind = "catalog_metadata" | "feed_candidate";

export type SourceChange = {
  kind: SourceChangeKind;
  sourceId: string;
  sourceType: string;
  animeTitle: string | null;
  sourceLabel: string;
  trustLevel: string;
  item: NormalizedSource;
};

export function sourceChangeKind(
  configuredKind: SourceChangeKind | undefined,
  sourceType: string,
): SourceChangeKind {
  return configuredKind ?? (sourceType === "bangumi" ? "catalog_metadata" : "feed_candidate");
}

export function partitionSourceChanges(changes: SourceChange[]) {
  return {
    catalogChanges: changes.filter((change) => change.kind === "catalog_metadata"),
    feedChanges: changes.filter((change) => change.kind === "feed_candidate"),
  };
}
