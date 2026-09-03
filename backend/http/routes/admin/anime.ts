import { Hono } from "hono";

import type { AnimeCreate, AnimePatch } from "@/domain";
import { parseAnimeCreate, parseAnimePatch } from "~/http/input/anime-input";
import type { ApiEnvironment } from "~/http/shared";
import { validatedJson } from "~/http/shared";

export const animeRoutes = new Hono<ApiEnvironment>()
  .post("/anime", validatedJson<AnimeCreate>(parseAnimeCreate), async (context) => {
    const id = await context.var.services.admin.anime.create(context.req.valid("json"));
    return context.json({ id }, 201);
  })
  .patch("/anime/:id", validatedJson<AnimePatch>(parseAnimePatch), async (context) => {
    await context.var.services.admin.anime.patch(context.req.param("id"), context.req.valid("json"));
    return context.json({ ok: true });
  });
