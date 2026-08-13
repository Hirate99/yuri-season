import { leaseWorkerJob } from "~/infrastructure/db/native/jobs";
import type { BatchItem } from "drizzle-orm/batch";
import { and, asc, desc, eq, isNull, lt, lte, or, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { researchSourcesTable, updateJobsTable } from "~/infrastructure/db/schema";
import { createId } from "~/shared/id";
import type { JobLane, UpdateJobRow } from "./types";
import { recoverExpiredJobs } from "./local-jobs";

const laneProfile: Record<JobLane, string> = {
  rapid: "rapid",
  standard: "standard",
  discovery: "local",
};

export async function planSourceJobs(db: D1Database, lane: JobLane, limit: number): Promise<number> {
  if (lane === "discovery") {
    const result = await database(db).insert(updateJobsTable).values({
      id: createId("job"),
      jobType: "discover_work",
      scopeType: "global",
      scopeId: null,
      researchRunId: null,
      executionTarget: "local",
      status: "planned",
      priority: 30,
      scheduledAt: sql`CURRENT_TIMESTAMP`,
      leaseUntil: null,
      attemptCount: 0,
      maxAttempts: 4,
      budgetJson: "{}",
      inputJson: JSON.stringify({ lane }),
      dedupeKey: "discover:season-current",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).onConflictDoNothing().run();
    return result.meta.changes ?? 0;
  }

  const orm = database(db);
  const due = await orm.select({ id: researchSourcesTable.id }).from(researchSourcesTable).where(and(
    eq(researchSourcesTable.enabled, true),
    eq(researchSourcesTable.cadenceProfile, laneProfile[lane] as "rapid" | "standard" | "local"),
    or(isNull(researchSourcesTable.nextCheckAt), lte(researchSourcesTable.nextCheckAt, sql`CURRENT_TIMESTAMP`)),
    or(isNull(researchSourcesTable.leaseUntil), lt(researchSourcesTable.leaseUntil, sql`CURRENT_TIMESTAMP`)),
  )).orderBy(
    desc(sql`CASE WHEN ${researchSourcesTable.urgencyUntil} > CURRENT_TIMESTAMP THEN 1 ELSE 0 END`),
    asc(sql`COALESCE(${researchSourcesTable.nextCheckAt}, '1970-01-01')`),
    researchSourcesTable.failureCount,
  ).limit(limit);
  if (due.length === 0) return 0;

  const queries = due.map((source, index) => orm.insert(updateJobsTable).values({
    id: createId("job"),
    jobType: "sync_source",
    scopeType: "source",
    scopeId: source.id,
    researchRunId: null,
    executionTarget: "worker",
    status: "planned",
    priority: lane === "rapid" ? 90 - index : 60 - index,
    scheduledAt: sql`CURRENT_TIMESTAMP`,
    leaseUntil: null,
    attemptCount: 0,
    maxAttempts: 4,
    budgetJson: "{}",
    inputJson: JSON.stringify({ lane }),
    dedupeKey: `sync:${source.id}`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).onConflictDoNothing()) as BatchItem<"sqlite">[];
  const results = await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
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
    const job = await leaseWorkerJob(db, runId);
    if (!job) break;
    jobs.push(job);
  }
  return jobs;
}

export async function startJob(db: D1Database, job: UpdateJobRow): Promise<void> {
  await database(db).update(updateJobsTable).set({
    status: "running",
    startedAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).where(and(eq(updateJobsTable.id, job.id), eq(updateJobsTable.status, "leased")));
}

export async function completeJob(db: D1Database, job: UpdateJobRow, partial = false): Promise<void> {
  await database(db).update(updateJobsTable).set({
    status: partial ? "partial" : "completed",
    leaseUntil: null,
    finishedAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).where(eq(updateJobsTable.id, job.id));
}

export async function failJob(db: D1Database, job: UpdateJobRow, error: unknown): Promise<void> {
  const retry = job.attempt_count < job.max_attempts;
  const delay = Math.min(360, 5 * 2 ** Math.max(0, job.attempt_count - 1));
  await database(db).update(updateJobsTable).set({
    status: retry ? "retry" : "dead",
    leaseUntil: null,
    scheduledAt: sql`datetime('now', ${`+${delay} minutes`})`,
    lastError: error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800),
    finishedAt: retry ? null : sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).where(eq(updateJobsTable.id, job.id));
}
