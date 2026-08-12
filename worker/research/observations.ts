import { createId } from "../http";
import { stableFingerprint } from "../lib/fingerprint";
import type { CandidateDraft } from "@/domain";
import type { NormalizedSource, SourceRecord } from "./types";

export async function sourceHasBaseline(db: D1Database, sourceId: string): Promise<boolean> {
  const row = await db.prepare(`
    SELECT 1 AS present FROM source_observations WHERE source_id = ? LIMIT 1
  `).bind(sourceId).first<{ present: number }>();
  return Boolean(row);
}

export async function storeObservation(
  db: D1Database,
  source: SourceRecord,
  item: NormalizedSource,
  httpStatus: number,
): Promise<{ id: string; inserted: boolean }> {
  const existing = await db.prepare(`
    SELECT id FROM source_observations WHERE source_id = ? AND content_hash = ?
  `).bind(source.id, item.contentHash).first<{ id: string }>();
  if (existing) return { id: existing.id, inserted: false };

  const id = createId("observation");
  const result = await db.prepare(`
    INSERT OR IGNORE INTO source_observations (
      id, source_id, anime_id, canonical_url, source_item_id, title, excerpt,
      author_name, published_at, connector_version, original_language,
      content_type, http_status, content_hash, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'incremental-http@1', ?, ?, ?, ?, ?)
  `).bind(
    id,
    source.id,
    source.anime_id,
    item.canonicalUrl,
    item.sourceItemId,
    item.title,
    item.excerpt,
    item.authorName,
    item.publishedAt,
    item.language,
    item.contentType,
    httpStatus,
    item.contentHash,
    JSON.stringify(item.metadata),
  ).run();
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
  const existing = await db.prepare("SELECT id FROM claims WHERE fingerprint = ?")
    .bind(fingerprint).first<{ id: string }>();
  if (existing) return existing.id;
  const id = createId("claim");
  await db.prepare(`
    INSERT INTO claims (
      id, observation_id, anime_id, subject_type, subject_id, predicate,
      value_json, extraction_method, confidence, fingerprint
    ) VALUES (?, ?, ?, 'anime', ?, 'feed_candidate', ?, 'llm', ?, ?)
  `).bind(
    id,
    observationId,
    draft.animeId ?? null,
    draft.animeId ?? null,
    valueJson,
    draft.confidence ?? 0,
    fingerprint,
  ).run();
  return id;
}
