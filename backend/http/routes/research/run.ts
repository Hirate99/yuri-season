import { Hono } from "hono";
import { z } from "zod";

import { parseWithSchema } from "~/http/input/schema";
import type { JobLane } from "~/research/types";
import type { ApiEnvironment } from "../../shared";
import { validatedJson } from "../../shared";

const researchRunSchema = z.object({
  lane: z.enum(["rapid", "standard", "discovery"], "未知的更新通道。").default("standard"),
});

type ResearchRunRequest = z.input<typeof researchRunSchema>;
type ResearchRunInput = { lane: JobLane };

export const runRoutes = new Hono<ApiEnvironment>()
  .post(
    "/research/run",
    validatedJson<ResearchRunRequest, ResearchRunInput>((value) => parseWithSchema(researchRunSchema, value)),
    async (context) => context.json(await context.var.services.research.run(context.req.valid("json").lane)),
  );
