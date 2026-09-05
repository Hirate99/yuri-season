import { Hono } from "hono";

import { animeCreateSchema, animePatchSchema } from "@/domain/inputs/anime";
import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

export const animeRoutes = new Hono<ApiEnvironment>()
  .post("/anime", validate("json", animeCreateSchema), async (context) => {
    const id = await context.var.services.admin.anime.create(context.req.valid("json"));
    return context.json({ id }, 201);
  })
  .patch("/anime/:id", validate("json", animePatchSchema), async (context) => {
    await context.var.services.admin.anime.patch(context.req.param("id"), context.req.valid("json"));
    return context.json({ ok: true });
  });
