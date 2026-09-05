import { Hono } from "hono";
import { z } from "zod";

import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

const researchRunSchema = z.object({
  lane: z.enum(["rapid", "standard", "discovery"], "未知的更新通道。").default("standard"),
});

export const runRoutes = new Hono<ApiEnvironment>()
  .post(
    "/research/run",
    validate("json", researchRunSchema),
    async (context) => context.json(await context.var.services.research.run(context.req.valid("json").lane)),
  );
