import { Hono } from "hono";
import { z } from "zod";

import type { ApiEnvironment } from "~/http/shared";
import { validatedQuery } from "~/http/shared";
import { parseWithSchema } from "~/http/input/schema";

const dashboardQuery = z.object({
  view: z.enum(["all", "overview", "review", "works", "coverage", "automation", "seasons"]).default("all"),
});

export const dashboardRoutes = new Hono<ApiEnvironment>()
  .get("/dashboard", validatedQuery<z.input<typeof dashboardQuery>, z.output<typeof dashboardQuery>>(
    (input) => parseWithSchema(dashboardQuery, input),
  ), async (context) => context.json(await context.var.services.admin.dashboard(context.req.valid("query").view)));
