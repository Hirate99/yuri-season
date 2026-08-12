import type { SearchMemoryHitSummary, SearchMemorySummary, SearchMemoryWrite } from "@/domain";
import { createId } from "../http";

export type SearchHitOutcome = "seen" | "candidate" | "published" | "held" | "rejected" | "ignored";

export async function resolveSearchHit(
  db: D1Database,
  canonicalUrl: string,
  outcome: SearchHitOutcome,
  links: { observationId?: string; candidateId?: string } = {},
): Promise<number> {
  const result = await db.prepare(`
    UPDATE search_memory_hits SET
      outcome = ?,
      observation_id = COALESCE(?, observation_id),
      candidate_id = COALESCE(?, candidate_id)
    WHERE canonical_url = ?
  `).bind(
    outcome,
    links.observationId ?? null,
    links.candidateId ?? null,
    canonicalUrl,
  ).run();
  return result.meta.changes ?? 0;
}

export async function rememberSearch(db: D1Database, records: SearchMemoryWrite[]) {
  let hitCount = 0;
  for (const record of records) {
    const existing = await db.prepare(`
      SELECT id FROM search_memory
      WHERE scope_type = ? AND scope_id = ? AND search_kind = ? AND target_key = ?
    `).bind(record.scopeType, record.scopeId, record.searchKind, record.targetKey).first<{ id: string }>();
    const id = existing?.id ?? createId("memory");
    if (existing) {
      await db.prepare(`
        UPDATE search_memory SET query_text = ?, status = ?, cursor_json = ?,
          last_result_hash = ?, last_result_count = ?, useful_result_count = ?,
          last_searched_at = ?, next_search_at = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        record.queryText, record.status, JSON.stringify(record.cursor ?? {}), record.lastResultHash,
        record.lastResultCount, record.usefulResultCount, record.searchedAt,
        record.nextSearchAt ?? null, record.notes ?? null, id,
      ).run();
    } else {
      await db.prepare(`
        INSERT INTO search_memory (
          id, scope_type, scope_id, search_kind, target_key, query_text, status,
          cursor_json, last_result_hash, last_result_count, useful_result_count,
          last_searched_at, next_search_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, record.scopeType, record.scopeId, record.searchKind, record.targetKey,
        record.queryText, record.status, JSON.stringify(record.cursor ?? {}), record.lastResultHash,
        record.lastResultCount, record.usefulResultCount, record.searchedAt,
        record.nextSearchAt ?? null, record.notes ?? null,
      ).run();
    }
    for (const hit of record.hits) {
      const prior = await db.prepare(`
        SELECT id, outcome FROM search_memory_hits WHERE memory_id = ? AND canonical_url = ?
      `).bind(id, hit.canonicalUrl).first<{ id: string; outcome: string }>();
      if (prior) {
        const outcome = prior.outcome === "seen" ? hit.outcome : prior.outcome;
        await db.prepare(`
          UPDATE search_memory_hits SET title = ?, content_hash = ?, outcome = ?,
            observation_id = COALESCE(?, observation_id), candidate_id = COALESCE(?, candidate_id),
            metadata_json = ?, last_seen_at = ? WHERE id = ?
        `).bind(
          hit.title, hit.contentHash, outcome, hit.observationId ?? null, hit.candidateId ?? null,
          JSON.stringify(hit.metadata ?? {}), record.searchedAt, prior.id,
        ).run();
      } else {
        await db.prepare(`
          INSERT INTO search_memory_hits (
            id, memory_id, canonical_url, title, content_hash, outcome,
            observation_id, candidate_id, metadata_json, first_seen_at, last_seen_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          createId("hit"), id, hit.canonicalUrl, hit.title, hit.contentHash, hit.outcome,
          hit.observationId ?? null, hit.candidateId ?? null, JSON.stringify(hit.metadata ?? {}),
          record.searchedAt, record.searchedAt,
        ).run();
      }
      hitCount += 1;
    }
  }
  return { records: records.length, hits: hitCount };
}

export async function readSearchMemory(db: D1Database): Promise<SearchMemorySummary[]> {
  const { results } = await db.prepare(`
    SELECT sm.id, sm.scope_type, sm.scope_id, sm.search_kind, sm.target_key,
      sm.query_text, sm.status, sm.last_result_hash, sm.last_result_count,
      sm.useful_result_count, sm.last_searched_at, sm.next_search_at, sm.notes,
      SUM(CASE WHEN h.outcome = 'seen' THEN 1 ELSE 0 END) AS seen_count,
      SUM(CASE WHEN h.outcome = 'candidate' THEN 1 ELSE 0 END) AS candidate_count,
      SUM(CASE WHEN h.outcome = 'published' THEN 1 ELSE 0 END) AS published_count,
      SUM(CASE WHEN h.outcome = 'held' THEN 1 ELSE 0 END) AS held_count,
      SUM(CASE WHEN h.outcome = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
      SUM(CASE WHEN h.outcome = 'ignored' THEN 1 ELSE 0 END) AS ignored_count
    FROM search_memory sm LEFT JOIN search_memory_hits h ON h.memory_id = sm.id
    GROUP BY sm.id ORDER BY sm.last_searched_at DESC, sm.id LIMIT 300
  `).all<Record<string, string | number | null>>();
  return results.map((row) => ({
    id: String(row.id), scopeType: row.scope_type as SearchMemorySummary["scopeType"],
    scopeId: String(row.scope_id), searchKind: row.search_kind as SearchMemorySummary["searchKind"],
    targetKey: String(row.target_key), queryText: String(row.query_text),
    status: row.status as SearchMemorySummary["status"], lastResultHash: row.last_result_hash as string | null,
    lastResultCount: Number(row.last_result_count), usefulResultCount: Number(row.useful_result_count),
    searchedAt: String(row.last_searched_at), nextSearchAt: row.next_search_at as string | null,
    notes: row.notes as string | null, seenCount: Number(row.seen_count), candidateCount: Number(row.candidate_count),
    publishedCount: Number(row.published_count), heldCount: Number(row.held_count),
    rejectedCount: Number(row.rejected_count), ignoredCount: Number(row.ignored_count),
  }));
}

export async function readSearchMemoryHits(db: D1Database): Promise<SearchMemoryHitSummary[]> {
  const { results } = await db.prepare(`
    SELECT h.memory_id, h.canonical_url, h.title, h.content_hash, h.outcome,
      h.metadata_json, h.first_seen_at, h.last_seen_at
    FROM search_memory_hits h
    INNER JOIN search_memory m ON m.id = h.memory_id
    ORDER BY h.last_seen_at DESC, h.id
    LIMIT 5000
  `).all<Record<string, string | null>>();
  return results.map((row) => ({
    memoryId: String(row.memory_id),
    canonicalUrl: String(row.canonical_url),
    title: row.title,
    contentHash: row.content_hash,
    outcome: row.outcome as SearchMemoryHitSummary["outcome"],
    metadata: JSON.parse(row.metadata_json ?? "{}") as Record<string, unknown>,
    firstSeenAt: String(row.first_seen_at),
    lastSeenAt: String(row.last_seen_at),
  }));
}
