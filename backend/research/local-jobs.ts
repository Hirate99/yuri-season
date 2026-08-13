import type { LocalJobCompletion, LocalJobLease } from "@/domain";
import { and, eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { completeLocalLease, heartbeatLocalLease, leaseLocalJob } from "~/infrastructure/db/native/jobs";
import { researchRunsTable, updateJobsTable } from "~/infrastructure/db/schema";
import type { CompleteLocalJobInput } from "./types";
import { stableFingerprint } from "~/shared/fingerprint";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

const LEASE_MINUTES = 20;

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
  const result = await database(db).update(updateJobsTable).set({
    status: sql`CASE WHEN ${updateJobsTable.attemptCount} >= ${updateJobsTable.maxAttempts} THEN 'dead' ELSE 'retry' END`,
    leaseOwner: null,
    leaseTokenHash: null,
    leaseUntil: null,
    lastError: sql`COALESCE(${updateJobsTable.lastError}, 'lease expired')`,
    finishedAt: sql`CASE WHEN ${updateJobsTable.attemptCount} >= ${updateJobsTable.maxAttempts} THEN CURRENT_TIMESTAMP ELSE NULL END`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).where(sql`${updateJobsTable.status} IN ('leased', 'running')
    AND ${updateJobsTable.leaseUntil} IS NOT NULL AND ${updateJobsTable.leaseUntil} < CURRENT_TIMESTAMP`).run();
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
    const row = await leaseLocalJob(db, owner, tokenHash, LEASE_MINUTES);
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
  const row = await heartbeatLocalLease(db, jobId, tokenHash, LEASE_MINUTES);
  if (!row) throw new HttpError(409, "任务租约已失效或不属于当前执行者。");
  return { id: row.id, status: row.status, leaseUntil: row.lease_until };
}

async function readCompletion(db: D1Database, jobId: string): Promise<CompletionRow | null> {
  const row = await database(db).select({
    id: updateJobsTable.id,
    status: updateJobsTable.status,
    research_run_id: updateJobsTable.researchRunId,
    lease_token_hash: updateJobsTable.leaseTokenHash,
    lease_until: updateJobsTable.leaseUntil,
    attempt_count: updateJobsTable.attemptCount,
    max_attempts: updateJobsTable.maxAttempts,
    completion_key: updateJobsTable.completionKey,
  }).from(updateJobsTable).where(and(
    eq(updateJobsTable.id, jobId),
    eq(updateJobsTable.executionTarget, "local"),
  )).get();
  return row ?? null;
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
    const run = await database(db).select({ id: researchRunsTable.id }).from(researchRunsTable).where(and(
      eq(researchRunsTable.id, input.runId),
      eq(researchRunsTable.triggerType, "local_skill"),
    )).get();
    if (!run) throw new HttpError(400, "runId 不是有效的本地研究批次。");
  }

  const exhausted = current.attempt_count >= current.max_attempts;
  const status: LocalJobCompletion["status"] = input.outcome === "failed"
    ? exhausted ? "dead" : "retry"
    : input.outcome;
  const delayMinutes = Math.min(360, 5 * 2 ** Math.max(0, current.attempt_count - 1));
  const resultJson = JSON.stringify(input.result);
  const auditDetailJson = JSON.stringify({ status, runId: input.runId, message: input.message });
  const update = await completeLocalLease(db, {
    status,
    runId: input.runId,
    idempotencyKey: input.idempotencyKey,
    resultJson,
    lastError: input.outcome === "failed" ? input.message : null,
    delayMinutes,
    jobId,
    tokenHash,
    auditId: `audit-${await stableFingerprint(`${jobId}|${input.idempotencyKey}`)}`,
    auditDetailJson,
  });
  if ((update.meta.changes ?? 0) === 0) {
    const latest = await readCompletion(db, jobId);
    if (latest?.completion_key === input.idempotencyKey) {
      return { id: latest.id, status: latest.status as LocalJobCompletion["status"], duplicate: true, runId: latest.research_run_id };
    }
    throw new HttpError(409, "任务状态已经变化，请重新领取。");
  }

  return { id: jobId, status, duplicate: false, runId: input.runId };
}
