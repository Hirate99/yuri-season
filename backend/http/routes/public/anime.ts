import { Hono } from "hono";

import { HttpError } from "~/shared/http-error";
import type { ApiEnvironment } from "~/http/shared";
import { publicJson } from "~/http/shared";

export const animeRoutes = new Hono<ApiEnvironment>()
  .get("/anime/:slug", async (context) => {
    const slug = context.req.param("slug");
    const page = await context.var.services.public.anime.page(slug);
    if (!page) throw new HttpError(404, "没有找到这部动画。");

    return publicJson(context, page);
  })
  .get("/anime/:slug/related", async (context) => {
    const slug = context.req.param("slug");
    const related = await context.var.services.public.anime.related(slug);
    if (!related) throw new HttpError(404, "没有找到这部动画。");

    return publicJson(context, related);
  });
