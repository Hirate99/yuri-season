import type { LocalJobCompletion, LocalJobLease } from "@/domain";
import { rpcData } from "@/lib/rpc";
import { adminApi } from "./lib/admin-dashboard";

type StoredLease = LocalJobLease & { completionKey: string };

const leaseDirectory = ".research-cache/job-leases";

function jobId(value: string | undefined): string {
  if (!value || !/^job-[a-zA-Z0-9-]+$/.test(value)) throw new Error("a valid job id is required");
  return value;
}

function leasePath(id: string): string {
  return `${leaseDirectory}/${id}.json`;
}

async function loadLease(id: string): Promise<StoredLease> {
  const file = Bun.file(leasePath(id));
  if (!await file.exists()) throw new Error(`no local lease for ${id}`);
  return file.json() as Promise<StoredLease>;
}

async function lease(): Promise<void> {
  const owner = process.env.YURI_AGENT_ID?.trim() || "codex-local";
  const limitValue = Number(process.argv[3] ?? 1);
  const { jobs } = await rpcData(adminApi().api.admin.jobs.lease.$post({ json: { owner, limit: limitValue } }));
  for (const job of jobs) {
    const stored: StoredLease = { ...job, completionKey: `complete-${crypto.randomUUID()}` };
    await Bun.write(leasePath(job.id), JSON.stringify(stored, null, 2));
  }
  process.stdout.write(JSON.stringify({
    leased: jobs.length,
    jobs: jobs.map(({ leaseToken: _leaseToken, ...job }) => job),
  }, null, 2));
}

async function heartbeat(id: string): Promise<void> {
  const stored = await loadLease(id);
  const result = await rpcData(adminApi().api.admin.jobs[":id"].heartbeat.$post({
    param: { id },
    json: { leaseToken: stored.leaseToken },
  }));
  await Bun.write(leasePath(id), JSON.stringify({ ...stored, leaseUntil: result.leaseUntil }, null, 2));
  process.stdout.write(JSON.stringify(result, null, 2));
}

async function finish(id: string, outcome: "completed" | "partial" | "failed"): Promise<void> {
  const stored = await loadLease(id);
  const runId = outcome === "failed" ? null : process.argv[4]?.trim() || null;
  const message = outcome === "failed" ? process.argv.slice(4).join(" ").trim() : null;
  if (outcome === "failed" && !message) throw new Error("failure message is required");
  const result = await rpcData(adminApi().api.admin.jobs[":id"].complete.$post({
    param: { id },
    json: {
      leaseToken: stored.leaseToken,
      idempotencyKey: stored.completionKey,
      outcome,
      runId,
      message,
      result: { jobType: stored.jobType, finishedBy: process.env.YURI_AGENT_ID?.trim() || "codex-local" },
    },
  }));
  await Bun.file(leasePath(id)).delete();
  process.stdout.write(JSON.stringify(result, null, 2));
}

const mode = process.argv[2] ?? "lease";
if (mode === "lease") await lease();
else if (mode === "heartbeat") await heartbeat(jobId(process.argv[3]));
else if (mode === "complete") await finish(jobId(process.argv[3]), "completed");
else if (mode === "partial") await finish(jobId(process.argv[3]), "partial");
else if (mode === "fail") await finish(jobId(process.argv[3]), "failed");
else throw new Error(`unknown local job mode: ${mode}`);
