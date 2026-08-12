import type { LocalJobCompletion, LocalJobLease } from "@/domain";
import type { CompleteLocalJobInput } from "../api/job-input";
import { createId, HttpError } from "../http";
import { stableFingerprint } from "../lib/fingerprint";

const LEASE_MINUTES = 20;

type LeaseRow = {
  id: string;
  job_type: string;
  scope_type: string;
  scope_id: string | null;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  budget_json: string;
  input_json: string;
  lease_until: string;
};

type CompletionRow = {
  id: string;
  status: "planned" | "leased" | "running" | "completed" | "partial" | "retry" | "dead";
  research_run_id: string | null;
  lease_token_hash: string | null;
  lease_until: string | null;
  attempt_count: number;
  max_attempts: number;
  completion_key: string | null;
};

function objectJson(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function recoverExpiredJobs(db: D1Database): Promise<number> {
  const result = await db.prepare(`
    UPDATE update_jobs SET
      status = CASE WHEN attempt_count >= max_attempts THEN 'dead' ELSE 'retry' END,
      lease_owner = NULL, lease_token_hash = NULL, lease_until = NULL,
      last_error = COALESCE(last_error, 'lease expired'),
      finished_at = CASE WHEN attempt_count >= max_attempts THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('leased', 'running')
      AND lease_until IS NOT NULL AND lease_until < CURRENT_TIMESTAMP
  `).run();
  return result.meta.changes ?? 0;
}

export async function leaseLocalJobs(
  db: D1Database,
  owner: string,
  limit: number,
): Promise<LocalJobLease[]> {
  await recoverExpiredJobs(db);
  const jobs: LocalJobLease[] = [];
  for (let index = 0; index < limit; index += 1) {
    const leaseToken = createId("lease");
    const tokenHash = await stableFingerprint(leaseToken);
    const row = await db.prepare(`
      UPDATE update_jobs SET
        status = 'leased', lease_owner = ?, lease_token_hash = ?,
        lease_until = datetime('now', '+${LEASE_MINUTES} minutes'),
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
        max_attempts, budget_json, input_json, lease_until
    `).bind(owner, tokenHash).first<LeaseRow>();
    if (!row) break;
    jobs.push({
      id: row.id,
      jobType: row.job_type,
      scopeType: row.scope_type,
      scopeId: row.scope_id,
      priority: row.priority,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      leaseUntil: row.lease_until,
      leaseToken,
      budget: objectJson(row.budget_json),
      input: objectJson(row.input_json),
    });
  }
  return jobs;
}

export async function heartbeatLocalJob(
  db: D1Database,
  jobId: string,
  leaseToken: string,
): Promise<{ id: string; status: "running"; leaseUntil: string }> {
  const tokenHash = await stableFingerprint(leaseToken);
  const row = await db.prepare(`
    UPDATE update_jobs SET status = 'running',
      started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
      last_heartbeat_at = CURRENT_TIMESTAMP,
      lease_until = datetime('now', '+${LEASE_MINUTES} minutes'),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND execution_target = 'local'
      AND status IN ('leased', 'running') AND lease_token_hash = ?
      AND lease_until >= CURRENT_TIMESTAMP
    RETURNING id, status, lease_until
  `).bind(jobId, tokenHash).first<{ id: string; status: "running"; lease_until: string }>();
  if (!row) throw new HttpError(409, "任务租约已失效或不属于当前执行者。");
  return { id: row.id, status: row.status, leaseUntil: row.lease_until };
}

async function readCompletion(db: D1Database, jobId: string): Promise<CompletionRow | null> {
  return db.prepare(`
    SELECT id, status, research_run_id, lease_token_hash, lease_until,
      attempt_count, max_attempts, completion_key
    FROM update_jobs WHERE id = ? AND execution_target = 'local'
  `).bind(jobId).first<CompletionRow>();
}

export async function completeLocalJob(
  db: D1Database,
  jobId: string,
  input: CompleteLocalJobInput,
): Promise<LocalJobCompletion> {
  const current = await readCompletion(db, jobId);
  if (!current) throw new HttpError(404, "没有找到这个本地任务。");
  if (current.completion_key === input.idempotencyKey && ["completed", "partial", "retry", "dead"].includes(current.status)) {
    return { id: current.id, status: current.status as LocalJobCompletion["status"], duplicate: true, runId: current.research_run_id };
  }

  const tokenHash = await stableFingerprint(input.leaseToken);
  if (!["leased", "running"].includes(current.status) || current.lease_token_hash !== tokenHash) {
    throw new HttpError(409, "任务租约已失效或不属于当前执行者。");
  }
  if (current.lease_until && Date.parse(`${current.lease_until.replace(" ", "T")}Z`) < Date.now()) {
    throw new HttpError(409, "任务租约已经过期。");
  }
  if (input.runId) {
    const run = await db.prepare("SELECT id FROM research_runs WHERE id = ? AND trigger_type = 'local_skill'")
      .bind(input.runId).first<{ id: string }>();
    if (!run) throw new HttpError(400, "runId 不是有效的本地研究批次。");
  }

  const exhausted = current.attempt_count >= current.max_attempts;
  const status: LocalJobCompletion["status"] = input.outcome === "failed"
    ? exhausted ? "dead" : "retry"
    : input.outcome;
  const delayMinutes = Math.min(360, 5 * 2 ** Math.max(0, current.attempt_count - 1));
  const resultJson = JSON.stringify(input.result);
  const update = await db.prepare(`
    UPDATE update_jobs SET status = ?, research_run_id = COALESCE(?, research_run_id),
      lease_owner = NULL, lease_token_hash = NULL, lease_until = NULL,
      completion_key = ?, result_json = ?, last_error = ?,
      scheduled_at = CASE WHEN ? = 'retry' THEN datetime('now', ?) ELSE scheduled_at END,
      finished_at = CASE WHEN ? IN ('completed', 'partial', 'dead') THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status IN ('leased', 'running') AND lease_token_hash = ?
  `).bind(
    status,
    input.runId,
    input.idempotencyKey,
    resultJson,
    input.outcome === "failed" ? input.message : null,
    status,
    `+${delayMinutes} minutes`,
    status,
    jobId,
    tokenHash,
  ).run();
  if ((update.meta.changes ?? 0) === 0) {
    const latest = await readCompletion(db, jobId);
    if (latest?.completion_key === input.idempotencyKey) {
      return { id: latest.id, status: latest.status as LocalJobCompletion["status"], duplicate: true, runId: latest.research_run_id };
    }
    throw new HttpError(409, "任务状态已经变化，请重新领取。");
  }

  await db.prepare(`
    INSERT INTO audit_log (id, actor_type, action, entity_type, entity_id, detail_json)
    VALUES (?, 'local_skill', 'complete_job', 'update_job', ?, ?)
  `).bind(createId("audit"), jobId, JSON.stringify({ status, runId: input.runId, message: input.message })).run();
  return { id: jobId, status, duplicate: false, runId: input.runId };
}
