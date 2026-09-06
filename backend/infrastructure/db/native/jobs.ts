import { nativeStatement } from "./statement";

export type NativeWorkerJobRow = {
  id: string;
  job_type: string;
  scope_type: string;
  scope_id: string | null;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  input_json: string;
  research_run_id: string;
  lease_token_hash: string;
};

export type NativeLocalLeaseRow = NativeWorkerJobRow & {
  budget_json: string;
  lease_until: string;
};

export async function leaseWorkerJob(
  db: D1Database,
  runId: string,
  tokenHash: string,
  leaseMinutes: number,
): Promise<NativeWorkerJobRow | null> {
  return nativeStatement(db, `
    UPDATE update_jobs SET
      status = 'leased', research_run_id = ?, lease_token_hash = ?,
      lease_until = datetime('now', '+' || ? || ' minutes'),
      last_heartbeat_at = CURRENT_TIMESTAMP,
      attempt_count = attempt_count + 1, last_error = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = (
      SELECT id FROM update_jobs
      WHERE status IN ('planned', 'retry') AND execution_target = 'worker'
        AND scheduled_at <= CURRENT_TIMESTAMP
        AND (lease_until IS NULL OR lease_until < CURRENT_TIMESTAMP)
      ORDER BY priority DESC, scheduled_at, created_at LIMIT 1
    )
    RETURNING id, job_type, scope_type, scope_id, priority, attempt_count,
      max_attempts, input_json, research_run_id, lease_token_hash
  `).bind(runId, tokenHash, leaseMinutes).first<NativeWorkerJobRow>();
}

export async function leaseLocalJob(
  db: D1Database,
  owner: string,
  tokenHash: string,
  leaseMinutes: number,
): Promise<NativeLocalLeaseRow | null> {
  return nativeStatement(db, `
    UPDATE update_jobs SET
      status = 'leased', lease_owner = ?, lease_token_hash = ?,
      lease_until = datetime('now', '+' || ? || ' minutes'),
      last_heartbeat_at = CURRENT_TIMESTAMP,
      attempt_count = attempt_count + 1, last_error = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = (
      SELECT id FROM update_jobs
      WHERE status IN ('planned', 'retry') AND execution_target = 'local'
        AND scheduled_at <= CURRENT_TIMESTAMP AND attempt_count < max_attempts
      ORDER BY priority DESC, scheduled_at, created_at LIMIT 1
    )
    RETURNING id, job_type, scope_type, scope_id, priority, attempt_count,
      max_attempts, budget_json, input_json, lease_until, research_run_id, lease_token_hash
  `).bind(owner, tokenHash, leaseMinutes).first<NativeLocalLeaseRow>();
}

export async function heartbeatLocalLease(
  db: D1Database,
  jobId: string,
  tokenHash: string,
  leaseMinutes: number,
): Promise<{ id: string; status: "running"; lease_until: string } | null> {
  return nativeStatement(db, `
    UPDATE update_jobs SET status = 'running',
      started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
      last_heartbeat_at = CURRENT_TIMESTAMP,
      lease_until = datetime('now', '+' || ? || ' minutes'),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND execution_target = 'local'
      AND status IN ('leased', 'running') AND lease_token_hash = ?
      AND lease_until >= CURRENT_TIMESTAMP
    RETURNING id, status, lease_until
  `).bind(leaseMinutes, jobId, tokenHash).first<{ id: string; status: "running"; lease_until: string }>();
}

export async function completeLocalLease(
  db: D1Database,
  input: {
    status: "completed" | "partial" | "retry" | "dead";
    runId: string | null;
    idempotencyKey: string;
    resultJson: string;
    lastError: string | null;
    delayMinutes: number;
    jobId: string;
    tokenHash: string;
    auditId: string;
    auditDetailJson: string;
  },
): Promise<D1Result> {
  const update = nativeStatement(db, `
    UPDATE update_jobs SET status = ?, research_run_id = COALESCE(?, research_run_id),
      lease_owner = NULL, lease_token_hash = NULL, lease_until = NULL,
      completion_key = ?, result_json = ?, last_error = ?,
      scheduled_at = CASE WHEN ? = 'retry' THEN datetime('now', '+' || ? || ' minutes') ELSE scheduled_at END,
      finished_at = CASE WHEN ? IN ('completed', 'partial', 'dead') THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND execution_target = 'local'
      AND status IN ('leased', 'running') AND lease_token_hash = ?
      AND lease_until >= CURRENT_TIMESTAMP
  `).bind(
    input.status,
    input.runId,
    input.idempotencyKey,
    input.resultJson,
    input.lastError,
    input.status,
    input.delayMinutes,
    input.status,
    input.jobId,
    input.tokenHash,
  );
  const audit = nativeStatement(db, `
    INSERT OR IGNORE INTO audit_log (
      id, actor_type, action, entity_type, entity_id, detail_json, created_at
    )
    SELECT ?, 'local_skill', 'complete_job', 'update_job', ?, ?, CURRENT_TIMESTAMP
    WHERE EXISTS (
      SELECT 1 FROM update_jobs WHERE id = ? AND completion_key = ? AND status = ?
    )
  `).bind(
    input.auditId,
    input.jobId,
    input.auditDetailJson,
    input.jobId,
    input.idempotencyKey,
    input.status,
  );
  return (await db.batch([update, audit]))[0];
}
