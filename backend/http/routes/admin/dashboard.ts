import { Hono } from "hono";
import { z } from "zod";

import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

const dashboardQuery = z.object({
  view: z.enum(["all", "overview", "review", "works", "coverage", "automation", "seasons"]).default("all"),
});

export const dashboardRoutes = new Hono<ApiEnvironment>()
  .get("/summary", async context => context.json(await context.var.services.admin.pages.summary()))
  .get("/overview", async context => context.json(await context.var.services.admin.pages.overview()))
  .get("/works", async context => context.json(await context.var.services.admin.pages.works()))
  .get("/review", async context => context.json(await context.var.services.admin.pages.review()))
  .get("/automation", async context => context.json(await context.var.services.admin.pages.automation()))
  .get("/coverage", async context => context.json(await context.var.services.admin.pages.coverage()))
  .get("/dashboard", validate("query", dashboardQuery), async (context) => context.json(await context.var.services.admin.dashboard(context.req.valid("query").view)));
