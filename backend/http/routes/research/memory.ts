import { Hono } from "hono";
import { z } from "zod";

import { searchMemoryBatchSchema } from "~/http/input/search-memory-input";
import { sourceChecksSchema } from "~/http/input/source-check-input";
import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

export const memoryRoutes = new Hono<ApiEnvironment>()
  .post(
    "/research/context",
    validate(
      "json",
      z.object({
        mode: z.enum(["routine", "discovery"]),
        sourceIds: z.array(z.string().min(1).max(700)).min(1).max(20).optional(),
      }),
    ),
    async (context) => {
      const input = context.req.valid("json");
      return context.json(await context.var.services.research.context(input.mode, input.sourceIds));
    },
  )
  .get("/research/memory", async (context) => {
    const includeHits = context.req.query("includeHits") === "1";

    return context.json(
      await context.var.services.research.memory.read(
        includeHits,
        context.req.query("hitScope") === "unfinished",
      ),
    );
  })
  .post("/research/memory", validate("json", searchMemoryBatchSchema), async (context) =>
    context.json(await context.var.services.research.memory.write(context.req.valid("json"))),
  )
  .post("/research/source-checks", validate("json", sourceChecksSchema), async (context) =>
    context.json(
      await context.var.services.research.sources.recordChecks(context.req.valid("json")),
    ),
  );
