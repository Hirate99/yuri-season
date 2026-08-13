import { Hono } from "hono";

import type { ApiEnvironment } from "../../shared";
import { cachedPublicJson } from "../../shared";
import { cacheKeyPart } from "./shared";

export const catalogRoutes = new Hono<ApiEnvironment>()
  .get("/health", (context) => context.json({ ok: true, now: new Date().toISOString() }))
  .get("/catalog", (context) =>
    cachedPublicJson(context, "catalog", 300, () => context.var.services.public.catalog.current()))
  .get("/calendar", (context) =>
    cachedPublicJson(context, "calendar", 120, () => context.var.services.public.calendar.current()))
  .get("/seasons", (context) =>
    cachedPublicJson(context, "seasons", 900, () => context.var.services.public.seasons()))
  .get("/seasons/:slug", (context) => {
    const slug = context.req.param("slug");
    return cachedPublicJson(context, `season:${cacheKeyPart(slug)}`, 300, () =>
      context.var.services.public.catalog.season(slug));
  })
  .get("/seasons/:slug/calendar", (context) => {
    const slug = context.req.param("slug");
    return cachedPublicJson(context, `season-calendar:${cacheKeyPart(slug)}`, 120, () =>
      context.var.services.public.calendar.season(slug));
  });
