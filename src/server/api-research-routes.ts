import { z } from "zod";

import { parseCompleteLocalJob, parseHeartbeatLocalJob, parseLeaseLocalJobs } from "@worker/api/job-input";
import { parseWithSchema } from "@worker/api/schema";
import { parseSearchMemoryBatch } from "@worker/api/search-memory-input";
import { parseSourceChecks } from "@worker/api/source-check-input";
import { readSearchMemory, readSearchMemoryHits, rememberSearch } from "@worker/repositories/search-memory";
import { recordSourceChecks } from "@worker/repositories/source-checks";
import { ingestResearchBatch } from "@worker/research/batch";
import { completeLocalJob, heartbeatLocalJob, leaseLocalJobs } from "@worker/research/local-jobs";
import { runResearch } from "@worker/research/scheduler";
import type { ApiApp } from "./api-shared";
import { jsonInput } from "./api-shared";

const researchRunSchema = z.object({
  lane: z.enum(["rapid", "standard", "discovery"], "未知的更新通道。").default("standard"),
});

export function registerResearchRoutes(api: ApiApp): void {
  api.post("/api/admin/batches", async (context) => {
    const input = await jsonInput(context, (value) => value);
    return context.json(await ingestResearchBatch(context.env.DB, input), 202);
  });

  api.post("/api/admin/jobs/lease", async (context) => {
    const input = await jsonInput(context, parseLeaseLocalJobs);
    return context.json({ jobs: await leaseLocalJobs(context.env.DB, input.owner, input.limit) });
  });

  api.post("/api/admin/jobs/:id/heartbeat", async (context) => {
    const input = await jsonInput(context, parseHeartbeatLocalJob);
    return context.json(await heartbeatLocalJob(context.env.DB, context.req.param("id"), input.leaseToken));
  });

  api.post("/api/admin/jobs/:id/complete", async (context) =>
    context.json(await completeLocalJob(
      context.env.DB,
      context.req.param("id"),
      await jsonInput(context, parseCompleteLocalJob),
    )));

  api.get("/api/admin/research/memory", async (context) => {
    const includeHits = context.req.query("includeHits") === "1";
    return context.json({
      records: await readSearchMemory(context.env.DB),
      ...(includeHits ? { hits: await readSearchMemoryHits(context.env.DB) } : {}),
    });
  });

  api.post("/api/admin/research/memory", async (context) =>
    context.json(await rememberSearch(context.env.DB, await jsonInput(context, parseSearchMemoryBatch))));

  api.post("/api/admin/research/source-checks", async (context) =>
    context.json(await recordSourceChecks(context.env.DB, await jsonInput(context, parseSourceChecks))));

  api.post("/api/admin/research/run", async (context) => {
    const { lane } = await jsonInput(context, (value) => parseWithSchema(researchRunSchema, value));
    return context.json(await runResearch(context.env, lane, "admin"), 202);
  });
}
