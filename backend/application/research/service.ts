import type { ResearchBatch, SearchMemoryWrite, SourceCheckWrite } from "@/domain";

import type { CompleteLocalJobInput, JobLane } from "~/research/types";
import { readSearchMemory, readSearchMemoryHits, rememberSearch } from "~/repositories/search-memory";
import { recordSourceChecks } from "~/repositories/source-checks";
import { ingestResearchBatch } from "~/research/batch";
import { completeLocalJob, heartbeatLocalJob, leaseLocalJobs } from "~/research/local-jobs";
import { runResearch } from "~/research/scheduler";
import { HttpError } from "~/shared/http-error";

export function createResearchService(env: Env) {
  return {
    batches: { ingest: (input: ResearchBatch) => ingestResearchBatch(env.DB, input) },
    jobs: {
      complete: (id: string, input: CompleteLocalJobInput) => completeLocalJob(env.DB, id, input),
      heartbeat: (id: string, leaseToken: string) => heartbeatLocalJob(env.DB, id, leaseToken),
      lease: (owner: string, limit: number) => leaseLocalJobs(env.DB, owner, limit),
    },
    memory: {
      read: async (includeHits: boolean) => ({
        records: await readSearchMemory(env.DB),
        ...(includeHits ? { hits: await readSearchMemoryHits(env.DB) } : {}),
      }),
      write: (input: SearchMemoryWrite[]) => rememberSearch(env.DB, input),
    },
    sources: { recordChecks: (input: SourceCheckWrite[]) => recordSourceChecks(env.DB, input) },
    run: (lane: JobLane) => {
      if (String(env.UPDATE_MODE) !== "worker") {
        throw new HttpError(409, "当前部署使用本地研究模式，不能启动 Worker 研究任务。");
      }
      return runResearch(env, lane, "admin");
    },
  };
}
