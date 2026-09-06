import { Hono } from "hono";

import { searchMemoryBatchSchema } from "~/http/input/search-memory-input";
import { sourceChecksSchema } from "~/http/input/source-check-input";
import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

export const memoryRoutes = new Hono<ApiEnvironment>()
  .get("/research/memory", async (context) => {
    const includeHits = context.req.query("includeHits") === "1";

    return context.json(await context.var.services.research.memory.read(includeHits));
  })
  .post("/research/memory", validate("json", searchMemoryBatchSchema), async (context) =>
    context.json(await context.var.services.research.memory.write(context.req.valid("json"))),
  )
  .post("/research/source-checks", validate("json", sourceChecksSchema), async (context) =>
    context.json(
      await context.var.services.research.sources.recordChecks(context.req.valid("json")),
    ),
  );
