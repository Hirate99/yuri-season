import { Hono } from "hono";

import type { ApiEnvironment } from "~/http/shared";
import { publicJson } from "~/http/shared";

export const catalogRoutes = new Hono<ApiEnvironment>()
  .get("/health", (context) => context.json({ ok: true, now: new Date().toISOString() }))
  .get("/catalog", async (context) =>
    publicJson(context, await context.var.services.public.catalog.current()))
  .get("/catalog/options", async (context) =>
    publicJson(context, await context.var.services.public.catalog.options()))
  .get("/calendar", async (context) =>
    publicJson(context, await context.var.services.public.calendar.current()))
  .get("/seasons", async (context) =>
    publicJson(context, await context.var.services.public.seasons()))
  .get("/seasons/:slug", async (context) => {
    const slug = context.req.param("slug");
    return publicJson(context, await context.var.services.public.catalog.season(slug));
  })
  .get("/seasons/:slug/calendar", async (context) => {
    const slug = context.req.param("slug");
    return publicJson(context, await context.var.services.public.calendar.season(slug));
  });
