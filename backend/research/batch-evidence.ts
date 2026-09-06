import type { BatchObservation, ResearchBatch } from "@/domain";

import { rememberSearch, resolveSearchHit } from "~/repositories/search-memory";

import type { SourceRecord } from "./types";

function searchKind(source: SourceRecord) {
  if (source.changeKind === "catalog_metadata") return "catalog" as const;

  if (source.sourceType === "community" || source.trustLevel === "community")
    return "community" as const;

  if (source.sourceType === "social") return "social" as const;

  return "official_news" as const;
}

export async function rememberBatchEvidence(
  db: D1Database,
  batch: ResearchBatch,
  source: SourceRecord,
  observation: BatchObservation,
  observationId: string,
  contentHash: string,
): Promise<void> {
  const matched = await resolveSearchHit(db, observation.canonicalUrl, "seen", { observationId });
  if (matched > 0) return;

  await rememberSearch(db, [
    {
      scopeType: "source",
      scopeId: source.id,
      searchKind: searchKind(source),
      targetKey: observation.canonicalUrl,
      queryText: observation.canonicalUrl,
      status: "active",
      cursor: {},
      lastResultHash: contentHash,
      lastResultCount: 1,
      usefulResultCount:
        observation.candidates.length > 0 || (observation.themeSongs?.length ?? 0) > 0 ? 1 : 0,
      searchedAt: batch.createdAt,
      nextSearchAt: null,
      notes: "Batch evidence was not present in the normalized registered-source result.",
      hits: [
        {
          canonicalUrl: observation.canonicalUrl,
          title: observation.title ?? null,
          contentHash,
          outcome: "seen",
          observationId,
          metadata: {
            sourceItemId: observation.sourceItemId ?? null,
            publishedAt: observation.publishedAt ?? null,
            discoveredBy: batch.agent,
          },
        },
      ],
    },
  ]);
}
