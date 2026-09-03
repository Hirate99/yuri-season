import { Hono } from "hono";

import type { SearchMemoryWrite, SourceCheckWrite } from "@/domain";
import { parseSearchMemoryBatch, type SearchMemoryBatchRequest } from "~/http/input/search-memory-input";
import { parseSourceChecks, type SourceChecksRequest } from "~/http/input/source-check-input";
import type { ApiEnvironment } from "~/http/shared";
import { validatedJson } from "~/http/shared";

export const memoryRoutes = new Hono<ApiEnvironment>()
  .get("/research/memory", async (context) => {
    const includeHits = context.req.query("includeHits") === "1";
    return context.json(await context.var.services.research.memory.read(includeHits));
  })
  .post(
    "/research/memory",
    validatedJson<SearchMemoryBatchRequest, SearchMemoryWrite[]>(parseSearchMemoryBatch),
    async (context) => context.json(await context.var.services.research.memory.write(context.req.valid("json"))),
  )
  .post(
    "/research/source-checks",
    validatedJson<SourceChecksRequest, SourceCheckWrite[]>(parseSourceChecks),
    async (context) => context.json(await context.var.services.research.sources.recordChecks(context.req.valid("json"))),
  );
