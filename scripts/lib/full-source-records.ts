import type { SearchMemoryWrite, SourceCheckWrite } from "@/domain";
import type { NormalizedSource } from "~/research/types";
import { stableFingerprint } from "~/shared/fingerprint";

export type FullSyncSource = {
  sourceId: string;
  animeTitle: string | null;
  sourceLabel: string;
  sourceType: string;
  changeKind: "catalog_metadata" | "feed_candidate";
  trustLevel: string;
  url: string;
  items: NormalizedSource[];
  etag?: string | null;
  lastModified?: string | null;
};

export type FullSyncResult = {
  schemaVersion: number;
  createdAt: string;
  mode: string;
  sources: FullSyncSource[];
  errors: Array<{ sourceId: string; message: string }>;
};

export function sourceChecks(result: FullSyncResult): SourceCheckWrite[] {
  return [
    ...result.sources.map((source): SourceCheckWrite => ({
      sourceId: source.sourceId, checkedAt: result.createdAt, outcome: "success",
      etag: source.etag ?? null, lastModified: source.lastModified ?? null,
    })),
    ...result.errors.map((error): SourceCheckWrite => ({
      sourceId: error.sourceId, checkedAt: result.createdAt, outcome: "failure", error: error.message,
    })),
  ];
}

export async function searchRecords(result: FullSyncResult): Promise<SearchMemoryWrite[]> {
  return Promise.all(result.sources.map(async (source) => ({
    scopeType: "source", scopeId: source.sourceId, searchKind: "registered_source",
    targetKey: source.url, queryText: source.url, status: "active", cursor: {},
    lastResultHash: await stableFingerprint(source.items.map((item) => item.contentHash).join("|")),
    lastResultCount: source.items.length, usefulResultCount: 0, searchedAt: result.createdAt,
    nextSearchAt: new Date(new Date(result.createdAt).valueOf() + 7 * 86_400_000).toISOString(),
    notes: `full-source-sync · ${source.sourceType} · ${source.changeKind}`,
    hits: source.items.map((item) => ({
      canonicalUrl: item.canonicalUrl, title: item.title, contentHash: item.contentHash,
      outcome: "seen", metadata: { sourceItemId: item.sourceItemId, publishedAt: item.publishedAt },
    })),
  })));
}
