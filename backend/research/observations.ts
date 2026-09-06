import { and, eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { claimsTable, sourceObservationsTable } from "~/infrastructure/db/schema";
import { stableFingerprint } from "~/shared/fingerprint";
import { createId } from "~/shared/id";
import { canonicalTemporal } from "~/shared/time";
import type { CandidateDraft } from "@/domain";
import type { NormalizedSource, SourceRecord } from "./types";

export async function sourceHasBaseline(db: D1Database, sourceId: string): Promise<boolean> {
  const row = await database(db)
    .select({ id: sourceObservationsTable.id })
    .from(sourceObservationsTable)
    .where(eq(sourceObservationsTable.sourceId, sourceId))
    .get();

  return Boolean(row);
}

export async function storeObservation(
  db: D1Database,
  source: SourceRecord,
  item: NormalizedSource,
  httpStatus: number,
): Promise<{ id: string; inserted: boolean }> {
  const orm = database(db);

  const existing = await orm
    .select({ id: sourceObservationsTable.id })
    .from(sourceObservationsTable)
    .where(
      and(
        eq(sourceObservationsTable.sourceId, source.id),
        eq(sourceObservationsTable.contentHash, item.contentHash),
      ),
    )
    .get();
  if (existing) return { id: existing.id, inserted: false };

  const id = createId("observation");

  const result = await orm
    .insert(sourceObservationsTable)
    .values({
      id,
      sourceId: source.id,
      animeId: source.animeId,
      canonicalUrl: item.canonicalUrl,
      sourceItemId: item.sourceItemId,
      title: item.title,
      excerpt: item.excerpt,
      publicText: item.publicText,
      authorName: item.authorName,
      publishedAt: item.publishedAt ? canonicalTemporal(item.publishedAt) : null,
      capturedAt: sql`CURRENT_TIMESTAMP`,
      connectorVersion: "incremental-http@1",
      originalLanguage: item.language,
      contentType: item.contentType,
      httpStatus,
      contentHash: item.contentHash,
      metadataJson: JSON.stringify(item.metadata),
    })
    .onConflictDoNothing()
    .run();

  return { id, inserted: (result.meta.changes ?? 0) > 0 };
}

export async function storeClaim(
  db: D1Database,
  observationId: string,
  draft: CandidateDraft,
): Promise<string> {
  const valueJson = JSON.stringify({
    contentClass: draft.contentClass,
    title: draft.title,
    summary: draft.summary,
    url: draft.url,
    publishedAt: draft.publishedAt,
  });

  const fingerprint = await stableFingerprint(`${observationId}|feed_candidate|${valueJson}`);
  const orm = database(db);

  const existing = await orm
    .select({ id: claimsTable.id })
    .from(claimsTable)
    .where(eq(claimsTable.fingerprint, fingerprint))
    .get();
  if (existing) return existing.id;

  const id = createId("claim");

  await orm.insert(claimsTable).values({
    id,
    observationId,
    animeId: draft.animeId ?? null,
    subjectType: "anime",
    subjectId: draft.animeId ?? null,
    predicate: "feed_candidate",
    valueJson,
    extractionMethod: "llm",
    confidence: draft.confidence ?? 0,
    status: "proposed",
    fingerprint,
  });

  return id;
}
