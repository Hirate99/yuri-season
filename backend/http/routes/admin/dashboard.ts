import { Hono } from "hono";

import type { ApiEnvironment } from "~/http/shared";

export const dashboardRoutes = new Hono<ApiEnvironment>()
  .get("/summary", async context => context.json(await context.var.services.admin.pages.summary()))
  .get("/overview", async context => context.json(await context.var.services.admin.pages.overview()))
  .get("/works", async context => context.json(await context.var.services.admin.pages.works()))
  .get("/review", async context => context.json(await context.var.services.admin.pages.review()))
  .get("/automation", async context => context.json(await context.var.services.admin.pages.automation()))
  .get("/coverage", async context => context.json(await context.var.services.admin.pages.coverage()))
  .get("/dashboard", async context => context.json(await context.var.services.admin.dashboard()));
