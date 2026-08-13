import { Hono } from "hono";

import type { ApiEnvironment } from "../../shared";

export const dashboardRoutes = new Hono<ApiEnvironment>()
  .get("/dashboard", async (context) =>
    context.json(await context.var.services.admin.dashboard()));
