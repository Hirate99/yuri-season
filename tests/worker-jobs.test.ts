import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { completeJob, heartbeatJob, leaseJobs, startJob } from "~/research/jobs";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
  database.exec("DELETE FROM update_jobs");
  database.exec(`
    INSERT INTO research_runs (
      id, trigger_type, status, source_count, observation_count, candidate_count,
      published_count, held_count, rejected_count, job_count, started_at
    ) VALUES (
      'run-worker-test', 'admin', 'running', 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP
    )
  `);
  database.exec(`
    INSERT INTO update_jobs (
      id, job_type, scope_type, scope_id, research_run_id, execution_target,
      status, priority, scheduled_at, lease_until, attempt_count, max_attempts,
      budget_json, input_json, dedupe_key, updated_at
    ) VALUES (
      'job-worker-test', 'sync_source', 'source', 'source-test', NULL, 'worker',
      'planned', 100, CURRENT_TIMESTAMP, NULL, 0, 4,
      '{}', '{}', 'worker-test', CURRENT_TIMESTAMP
    )
  `);
});

afterEach(() => database.close());

describe("Worker job fencing", () => {
  test("requires the active run and lease token for heartbeat and completion", async () => {
    const [job] = await leaseJobs(database.binding(), "run-worker-test", 1);
    expect(job).toMatchObject({ id: "job-worker-test", research_run_id: "run-worker-test" });
    expect(job.lease_token_hash).toBeString();

    await startJob(database.binding(), job);
    await expect(
      heartbeatJob(database.binding(), { ...job, lease_token_hash: "stale-token" }),
    ).rejects.toThrow("lease was lost");
    await heartbeatJob(database.binding(), job);
    await completeJob(database.binding(), job);

    expect(
      database.sqlite
        .query("SELECT status, lease_token_hash AS leaseTokenHash FROM update_jobs WHERE id = ?")
        .get(job.id),
    ).toEqual({ status: "completed", leaseTokenHash: null });
  });
});
