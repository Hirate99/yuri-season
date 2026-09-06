import { Hono } from "hono";

import { researchBatchSchema } from "~/http/input/batch-input";
import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

export const batchRoutes = new Hono<ApiEnvironment>()
  .post("/batches", validate("json", researchBatchSchema), async (context) => {
    const result = await context.var.services.research.batches.ingest(context.req.valid("json"));
    return context.json(result);
  });
