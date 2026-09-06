import type { ResearchRun, UpdateJob } from "@/domain";
import { Badge } from "@/components/badge";
import { dateTime } from "@/lib/format";

function parseMessage(value: string | null): Record<string, unknown> | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { note: value };
  } catch {
    return { note: value };
  }
}

function messageBits(value: string | null): string[] {
  const message = parseMessage(value);
  if (!message) return [];

  const bits: string[] = [];

  for (const key of ["lane", "scope", "note"] as const) {
    const item = message[key];
    if (typeof item === "string" && item.trim()) bits.push(item.trim());
  }

  const planned = message.planned;
  if (typeof planned === "number") bits.push(`${planned} 个计划任务`);

  const errors = message.errors;

  if (Array.isArray(errors) && errors.length > 0) bits.push(`${errors.length} 个错误`);
  else if (typeof errors === "number" && errors > 0) bits.push(`${errors} 个错误`);

  return [...new Set(bits)];
}

function runTone(status: ResearchRun["status"]): "rose" | "lime" | "amber" | "neutral" {
  if (status === "failed") return "rose";
  if (status === "completed") return "lime";
  if (status === "skipped") return "amber";

  return "neutral";
}

function jobTone(status: UpdateJob["status"]): "rose" | "lime" | "amber" | "neutral" {
  if (status === "dead") return "rose";
  if (status === "completed") return "lime";
  if (status === "retry" || status === "partial") return "amber";

  return "neutral";
}

export function RunMonitor({ runs, jobs }: { runs: ResearchRun[]; jobs: UpdateJob[] }) {
  return (
    <div className="grid gap-7">
      <section>
        <h3 className="mb-3 text-sm font-bold">最近批次</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {runs.map((run) => {
            const bits = messageBits(run.message);

            return (
              <article className="rounded-2xl bg-raised p-4.5" key={run.id}>
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <strong className="text-xs">{dateTime(run.startedAt)}</strong>
                    <p className="mt-1 text-[9px] text-muted">{run.triggerType}</p>
                  </div>
                  <Badge tone={runTone(run.status)}>{run.status}</Badge>
                </header>
                {bits.length > 0 && (
                  <p className="mt-3 text-[10px] leading-5 text-muted">{bits.join(" · ")}</p>
                )}
                <dl className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-white p-3">
                  {[
                    ["来源", run.sourceCount],
                    ["观察", run.observationCount],
                    ["候选", run.candidateCount],
                    ["发布", run.publishedCount],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[8px] text-muted">{label}</dt>
                      <dd className="mt-1 text-xs font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold">任务</h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <article className="rounded-2xl bg-raised p-4" key={job.id}>
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-xs">{job.jobType}</strong>
                  <p className="mt-1 truncate text-[9px] text-muted">
                    {job.scopeId ?? job.scopeType}
                  </p>
                </div>
                <Badge tone={jobTone(job.status)}>{job.status}</Badge>
              </header>
              <p className="mt-3 text-[9px] text-muted">
                {job.executionTarget}
                {job.leaseOwner ? ` · ${job.leaseOwner}` : ""} · 尝试 {job.attemptCount}
              </p>
              <time className="mt-2 block text-[9px] text-muted">
                {dateTime(job.leaseUntil ?? job.scheduledAt)}
              </time>
              {job.lastError && (
                <p className="mt-3 rounded-xl bg-[#fce8ef] px-3 py-2 text-[9px] leading-5 text-[#943653]">
                  {job.lastError}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
