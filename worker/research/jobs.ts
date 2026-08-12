import { createId } from "../http";
import type { JobLane, UpdateJobRow } from "./types";
import { recoverExpiredJobs } from "./local-jobs";

const laneProfile: Record<JobLane, string> = {
  rapid: "rapid",
  standard: "standard",
  discovery: "local",
};

export async function planSourceJobs(db: D1Database, lane: JobLane, limit: number): Promise<number> {
  if (lane === "discovery") {
    const result = await db.prepare(`
      INSERT OR IGNORE INTO update_jobs (
        id, job_type, scope_type, execution_target, priority, scheduled_at,
        input_json, dedupe_key
      ) VALUES (?, 'discover_work', 'global', 'local', 30, CURRENT_TIMESTAMP, ?, 'discover:season-current')
    `).bind(createId("job"), JSON.stringify({ lane })).run();
    return result.meta.changes ?? 0;
  }

  const due = await db.prepare(`
    SELECT id FROM research_sources
    WHERE enabled = 1 AND cadence_profile = ?
      AND (next_check_at IS NULL OR next_check_at <= CURRENT_TIMESTAMP)
      AND (lease_until IS NULL OR lease_until < CURRENT_TIMESTAMP)
    ORDER BY CASE WHEN urgency_until > CURRENT_TIMESTAMP THEN 1 ELSE 0 END DESC,
      COALESCE(next_check_at, '1970-01-01'), failure_count
    LIMIT ?
  `).bind(laneProfile[lane], limit).all<{ id: string }>();
  if (due.results.length === 0) return 0;

  const results = await db.batch(due.results.map((source, index) => db.prepare(`
    INSERT OR IGNORE INTO update_jobs (
      id, job_type, scope_type, scope_id, execution_target, priority,
      scheduled_at, input_json, dedupe_key
    ) VALUES (?, 'sync_source', 'source', ?, 'worker', ?, CURRENT_TIMESTAMP, ?, ?)
  `).bind(
    createId("job"),
    source.id,
    lane === "rapid" ? 90 - index : 60 - index,
    JSON.stringify({ lane }),
    `sync:${source.id}`,
  )));
  return results.reduce((total, result) => total + (result.meta.changes ?? 0), 0);
}

export async function leaseJobs(
  db: D1Database,
  runId: string,
  limit: number,
): Promise<UpdateJobRow[]> {
  await recoverExpiredJobs(db);
  const jobs: UpdateJobRow[] = [];
  for (let index = 0; index < limit; index += 1) {
    const job = await db.prepare(`
      UPDATE update_jobs SET
        status = 'leased', research_run_id = ?, lease_until = datetime('now', '+3 minutes'),
        attempt_count = attempt_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM update_jobs
        WHERE status IN ('planned', 'retry') AND execution_target = 'worker'
          AND scheduled_at <= CURRENT_TIMESTAMP
          AND (lease_until IS NULL OR lease_until < CURRENT_TIMESTAMP)
        ORDER BY priority DESC, scheduled_at, created_at LIMIT 1
      )
      RETURNING id, job_type, scope_type, scope_id, priority, attempt_count,
        max_attempts, input_json
    `).bind(runId).first<UpdateJobRow>();
    if (!job) break;
    jobs.push(job);
  }
  return jobs;
}

export async function startJob(db: D1Database, job: UpdateJobRow): Promise<void> {
  await db.prepare(`
    UPDATE update_jobs SET status = 'running', started_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'leased'
  `).bind(job.id).run();
}

export async function completeJob(db: D1Database, job: UpdateJobRow, partial = false): Promise<void> {
  await db.prepare(`
    UPDATE update_jobs SET status = ?, lease_until = NULL, finished_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(partial ? "partial" : "completed", job.id).run();
}

export async function failJob(db: D1Database, job: UpdateJobRow, error: unknown): Promise<void> {
  const retry = job.attempt_count < job.max_attempts;
  const delay = Math.min(360, 5 * 2 ** Math.max(0, job.attempt_count - 1));
  await db.prepare(`
    UPDATE update_jobs SET status = ?, lease_until = NULL,
      scheduled_at = datetime('now', ?), last_error = ?,
      finished_at = CASE WHEN ? = 'dead' THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(
    retry ? "retry" : "dead",
    `+${delay} minutes`,
    error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800),
    retry ? "retry" : "dead",
    job.id,
  ).run();
}
