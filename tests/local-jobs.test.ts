import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseCompleteLocalJob } from "~/http/input/job-input";
import { completeLocalJob, heartbeatLocalJob, leaseLocalJobs, recoverExpiredJobs } from "~/research/local-jobs";
import { planSourceJobs } from "~/research/jobs";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("local discovery job leases", () => {
  test("leases, heartbeats and completes idempotently without storing the raw token", async () => {
    expect(await planSourceJobs(database.binding(), "discovery", 1)).toBe(1);
    const [lease] = await leaseLocalJobs(database.binding(), "codex-test", 1);
    expect(lease).toMatchObject({ jobType: "discover_work", attemptCount: 1 });

    const stored = database.sqlite.query(`
      SELECT status, lease_owner, lease_token_hash FROM update_jobs WHERE id = ?
    `).get(lease.id) as { status: string; lease_owner: string; lease_token_hash: string };
    expect(stored).toMatchObject({ status: "leased", lease_owner: "codex-test" });
    expect(stored.lease_token_hash).not.toBe(lease.leaseToken);

    const heartbeat = await heartbeatLocalJob(database.binding(), lease.id, lease.leaseToken);
    expect(heartbeat.status).toBe("running");

    const input = parseCompleteLocalJob({
      leaseToken: lease.leaseToken,
      idempotencyKey: "completion-test-1",
      outcome: "completed",
      result: { checkedWorks: 8, changes: 0 },
    });
    const completed = await completeLocalJob(database.binding(), lease.id, input);
    expect(completed).toMatchObject({ status: "completed", duplicate: false });
    expect(await completeLocalJob(database.binding(), lease.id, input))
      .toMatchObject({ status: "completed", duplicate: true });

    const audit = database.sqlite.query(`
      SELECT COUNT(*) AS count FROM audit_log
      WHERE action = 'complete_job' AND entity_id = ?
    `).get(lease.id) as { count: number };
    expect(audit.count).toBe(1);
  });

  test("recovers an expired lease and rejects the stale execution token", async () => {
    await planSourceJobs(database.binding(), "discovery", 1);
    const [first] = await leaseLocalJobs(database.binding(), "codex-old", 1);
    database.sqlite.query(`
      UPDATE update_jobs SET status = 'running', lease_until = datetime('now', '-1 minute')
      WHERE id = ?
    `).run(first.id);

    expect(await recoverExpiredJobs(database.binding())).toBe(1);
    const [second] = await leaseLocalJobs(database.binding(), "codex-new", 1);
    expect(second.id).toBe(first.id);
    expect(second.attemptCount).toBe(2);
    expect(second.leaseToken).not.toBe(first.leaseToken);
    await expect(heartbeatLocalJob(database.binding(), first.id, first.leaseToken)).rejects.toMatchObject({ status: 409 });
    await expect(heartbeatLocalJob(database.binding(), second.id, second.leaseToken)).resolves.toMatchObject({ status: "running" });
  });

  test("uses server-side retry policy for failed local work", async () => {
    await planSourceJobs(database.binding(), "discovery", 1);
    const [lease] = await leaseLocalJobs(database.binding(), "codex-test", 1);
    const result = await completeLocalJob(database.binding(), lease.id, parseCompleteLocalJob({
      leaseToken: lease.leaseToken,
      idempotencyKey: "completion-test-failed",
      outcome: "failed",
      message: "official site timed out",
      result: { sourceErrors: 1 },
    }));
    expect(result.status).toBe("retry");

    const row = database.sqlite.query(`
      SELECT status, last_error, lease_token_hash, result_json FROM update_jobs WHERE id = ?
    `).get(lease.id) as Record<string, unknown>;
    expect(row).toMatchObject({ status: "retry", last_error: "official site timed out", lease_token_hash: null });
    expect(JSON.parse(String(row.result_json))).toEqual({ sourceErrors: 1 });
  });
});
