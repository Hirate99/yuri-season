import { Hono } from "hono";

import { seasonSchema } from "@/domain/inputs/season";
import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

export const seasonRoutes = new Hono<ApiEnvironment>()
  .post("/seasons", validate("json", seasonSchema), async (context) => {
    const id = await context.var.services.admin.seasons.create(context.req.valid("json"));

    return context.json({ id }, 201);
  })
  .patch("/seasons/:id", validate("json", seasonSchema), async (context) => {
    await context.var.services.admin.seasons.update(
      context.req.param("id"),
      context.req.valid("json"),
    );

    return context.json({ ok: true });
  });
