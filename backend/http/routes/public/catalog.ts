import { Hono } from "hono";
import { z } from "zod";

import type { ApiEnvironment } from "~/http/shared";
import { publicJson, validatedQuery } from "~/http/shared";
import { ianaTimezone, parseWithSchema } from "~/http/input/schema";

const homeQuery = z.object({
  timeZone: ianaTimezone("时区").default("Asia/Tokyo"),
  season: z.string().max(100).optional(),
});

export const catalogRoutes = new Hono<ApiEnvironment>()
  .get("/health", (context) => context.json({ ok: true, now: new Date().toISOString() }))
  .get("/home", validatedQuery<z.input<typeof homeQuery>, z.output<typeof homeQuery>>(
    (input) => parseWithSchema(homeQuery, input),
  ), async (context) => {
    const { timeZone, season } = context.req.valid("query");
    return publicJson(context, await context.var.services.public.home(timeZone, season));
  })
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
