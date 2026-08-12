import type { SourceCheckWrite } from "@/domain";

function successStatement(db: D1Database, check: SourceCheckWrite): D1PreparedStatement {
  return db.prepare(`
    UPDATE research_sources SET
      last_checked_at = ?, etag = COALESCE(?, etag),
      last_modified = COALESCE(?, last_modified), failure_count = 0,
      last_error = NULL, lease_until = NULL,
      next_check_at = CASE
        WHEN urgency_until > CURRENT_TIMESTAMP THEN datetime(?, '+2 minutes')
        ELSE datetime(?, '+' || poll_interval_min || ' minutes')
      END
    WHERE id = ? AND (last_checked_at IS NULL OR last_checked_at < ?)
  `).bind(
    check.checkedAt, check.etag ?? null, check.lastModified ?? null,
    check.checkedAt, check.checkedAt, check.sourceId, check.checkedAt,
  );
}

function failureStatement(db: D1Database, check: SourceCheckWrite): D1PreparedStatement {
  return db.prepare(`
    UPDATE research_sources SET
      last_checked_at = ?, failure_count = failure_count + 1,
      last_error = ?, lease_until = NULL,
      next_check_at = datetime(?, '+' || MIN(360, 5 * (failure_count + 1)) || ' minutes')
    WHERE id = ? AND (last_checked_at IS NULL OR last_checked_at < ?)
  `).bind(check.checkedAt, check.error, check.checkedAt, check.sourceId, check.checkedAt);
}

export async function recordSourceChecks(db: D1Database, checks: SourceCheckWrite[]) {
  if (checks.length === 0) return { received: 0, updated: 0 };
  const results = await db.batch(checks.map((check) => check.outcome === "success"
    ? successStatement(db, check)
    : failureStatement(db, check)));
  return {
    received: checks.length,
    updated: results.reduce((total, result) => total + (result.meta.changes ?? 0), 0),
  };
}
