import { createId } from "../http";
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
  await env.DB.prepare(`
    INSERT INTO research_runs (id, trigger_type, status, started_at, message)
    VALUES (?, ?, 'running', ?, ?)
  `).bind(runId, triggerType, startedAt, `lane=${lane}`).run();

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
    await env.DB.prepare(`
      UPDATE research_runs SET status = ?, source_count = ?, observation_count = ?,
        candidate_count = ?, published_count = ?, held_count = ?, rejected_count = ?,
        job_count = ?, message = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(
      status,
      counters.sources,
      counters.observations,
      counters.candidates,
      counters.published,
      counters.held,
      counters.rejected,
      jobs.length,
      JSON.stringify({ lane, planned, errors: errors.slice(0, 5) }),
      runId,
    ).run();
    return { id: runId, lane, status, planned, jobs: jobs.length, ...counters };
  } catch (error) {
    await env.DB.prepare(`
      UPDATE research_runs SET status = 'failed', message = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800), runId).run();
    throw error;
  }
}

export function laneForCron(cron: string): JobLane {
  if (cron === "*/5 * * * *") return "rapid";
  if (cron === "17,47 * * * *") return "standard";
  return "discovery";
}
