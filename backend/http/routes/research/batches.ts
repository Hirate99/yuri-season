import { Hono } from "hono";

import type { ResearchBatch } from "@/domain";
import { parseResearchBatch } from "~/http/input/batch-input";
import type { ApiEnvironment } from "../../shared";
import { invalidatePublicData, validatedJson } from "../../shared";

export const batchRoutes = new Hono<ApiEnvironment>()
  .post("/batches", validatedJson<ResearchBatch>(parseResearchBatch), async (context) => {
    const result = await context.var.services.research.batches.ingest(context.req.valid("json"));
    invalidatePublicData(context);
    return context.json(result, 202);
  });
