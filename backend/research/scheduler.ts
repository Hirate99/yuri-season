import { eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { researchRunsTable } from "~/infrastructure/db/schema";
import { createId } from "~/shared/id";
import { completeJob, failJob, leaseJobs, planSourceJobs, startJob } from "./jobs";
import { syncSourceJob } from "./pipeline";
import type { JobLane, RunCounters } from "./types";

const limits: Record<JobLane, { planned: number; leased: number }> = {
  rapid: { planned: 8, leased: 4 },
  standard: { planned: 14, leased: 8 },
  discovery: { planned: 1, leased: 0 },
};

function addCounters(target: RunCounters, next: RunCounters): void {
  for (const key of Object.keys(target) as (keyof RunCounters)[]) target[key] += next[key];
}

export async function runResearch(
  env: Env,
  lane: JobLane,
  triggerType: "cron" | "admin" | "local_skill" = "cron",
) {
  const runId = createId("run");
  const startedAt = new Date().toISOString();
  const orm = database(env.DB);
  await orm.insert(researchRunsTable).values({
    id: runId,
    externalBatchId: null,
    triggerType,
    status: "running",
    sourceCount: 0,
    observationCount: 0,
    candidateCount: 0,
    publishedCount: 0,
    heldCount: 0,
    rejectedCount: 0,
    jobCount: 0,
    message: `lane=${lane}`,
    startedAt,
    finishedAt: null,
  });

  const counters: RunCounters = {
    sources: 0,
    observations: 0,
    candidates: 0,
    published: 0,
    held: 0,
    rejected: 0,
  };
  const errors: string[] = [];
  try {
    const planned = await planSourceJobs(env.DB, lane, limits[lane].planned);
    const jobs = await leaseJobs(env.DB, runId, limits[lane].leased);
    for (const job of jobs) {
      await startJob(env.DB, job);
      try {
        if (job.job_type !== "sync_source") throw new Error(`unsupported worker job ${job.job_type}`);
        const outcome = await syncSourceJob(env, job);
        addCounters(counters, outcome.counters);
        await completeJob(env.DB, job, outcome.partial);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        await failJob(env.DB, job, error);
      }
    }

    const status = errors.length > 0 && counters.sources === 0 ? "failed" : jobs.length === 0 ? "skipped" : "completed";
    await orm.update(researchRunsTable).set({
      status,
      sourceCount: counters.sources,
      observationCount: counters.observations,
      candidateCount: counters.candidates,
      publishedCount: counters.published,
      heldCount: counters.held,
      rejectedCount: counters.rejected,
      jobCount: jobs.length,
      message: JSON.stringify({ lane, planned, errors: errors.slice(0, 5) }),
      finishedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(researchRunsTable.id, runId));
    return { id: runId, lane, status, planned, jobs: jobs.length, ...counters };
  } catch (error) {
    await orm.update(researchRunsTable).set({
      status: "failed",
      message: error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800),
      finishedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(researchRunsTable.id, runId));
    throw error;
  }
}

export function laneForCron(cron: string): JobLane {
  if (cron === "*/5 * * * *") return "rapid";
  if (cron === "17,47 * * * *") return "standard";
  return "discovery";
}
