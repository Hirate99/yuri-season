import { Hono } from "hono";

import type { SeasonWrite } from "@/domain";
import { parseSeasonWrite } from "~/http/input/season-input";
import type { ApiEnvironment } from "../../shared";
import { invalidatePublicData, validatedJson } from "../../shared";

export const seasonRoutes = new Hono<ApiEnvironment>()
  .post("/seasons", validatedJson<SeasonWrite>(parseSeasonWrite), async (context) => {
    const id = await context.var.services.admin.seasons.create(context.req.valid("json"));
    await invalidatePublicData(context);
    return context.json({ id }, 201);
  })
  .patch("/seasons/:id", validatedJson<SeasonWrite>(parseSeasonWrite), async (context) => {
    await context.var.services.admin.seasons.update(context.req.param("id"), context.req.valid("json"));
    await invalidatePublicData(context);
    return context.json({ ok: true });
  });
