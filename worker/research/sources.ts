import type { SourceRecord } from "./types";

async function readSourceRecord(db: D1Database, id: string, enabledOnly: boolean): Promise<SourceRecord | null> {
  return db.prepare(`
    SELECT rs.id, rs.anime_id, a.title_zh AS anime_title, rs.account_id,
      ac.owner_type AS account_owner_type, ac.owner_id AS account_owner_id,
      ac.platform AS account_platform, ac.handle AS account_handle,
      ac.verified AS account_verified,
      CASE
        WHEN ac.owner_type = 'anime' THEN 'official'
        WHEN ac.owner_type = 'person' AND rs.anime_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM cast_credits cc
          WHERE cc.anime_id = rs.anime_id AND cc.person_id = ac.owner_id
        ) THEN 'cast'
        WHEN rs.trust_level = 'official' THEN 'official'
        WHEN rs.trust_level = 'verified_creator' THEN 'creator'
        ELSE 'community'
      END AS source_identity,
      rs.source_type,
      rs.change_kind, rs.label, rs.url, rs.item_url_template, rs.trust_level, rs.cadence_profile,
      rs.poll_interval_min, rs.etag, rs.last_modified, rs.cursor
    FROM research_sources rs
    LEFT JOIN anime a ON a.id = rs.anime_id
    LEFT JOIN accounts ac ON ac.id = rs.account_id
    WHERE rs.id = ? ${enabledOnly ? "AND rs.enabled = 1" : ""}
  `).bind(id).first<SourceRecord>();
}

export async function readSource(db: D1Database, id: string): Promise<SourceRecord | null> {
  return readSourceRecord(db, id, true);
}

export async function readBatchSource(db: D1Database, id: string): Promise<SourceRecord | null> {
  return readSourceRecord(db, id, false);
}

export async function markSourceSuccess(
  db: D1Database,
  source: SourceRecord,
  etag: string | null,
  lastModified: string | null,
): Promise<void> {
  await db.prepare(`
    UPDATE research_sources SET
      last_checked_at = CURRENT_TIMESTAMP, etag = COALESCE(?, etag),
      last_modified = COALESCE(?, last_modified), failure_count = 0,
      last_error = NULL, lease_until = NULL,
      next_check_at = CASE
        WHEN urgency_until > CURRENT_TIMESTAMP THEN datetime('now', '+2 minutes')
        ELSE datetime('now', '+' || poll_interval_min || ' minutes')
      END
    WHERE id = ?
  `).bind(etag, lastModified, source.id).run();
}

export async function markSourceFailure(db: D1Database, sourceId: string, error: unknown): Promise<void> {
  await db.prepare(`
    UPDATE research_sources SET
      last_checked_at = CURRENT_TIMESTAMP, failure_count = failure_count + 1,
      last_error = ?, lease_until = NULL,
      next_check_at = datetime('now', '+' || MIN(360, 5 * (failure_count + 1)) || ' minutes')
    WHERE id = ?
  `).bind(error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800), sourceId).run();
}
