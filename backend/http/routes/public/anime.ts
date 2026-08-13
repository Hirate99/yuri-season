import { Hono } from "hono";

import { HttpError } from "~/shared/http-error";
import type { ApiEnvironment } from "../../shared";
import { cachedPublicData, publicJson } from "../../shared";
import { cacheKeyPart } from "./shared";

export const animeRoutes = new Hono<ApiEnvironment>()
  .get("/anime/:slug", async (context) => {
    const slug = context.req.param("slug");
    const page = await cachedPublicData(context, `anime:${cacheKeyPart(slug)}`, 180, () =>
      context.var.services.public.anime.page(slug));
    if (!page) throw new HttpError(404, "没有找到这部动画。");
    return publicJson(context, page);
  });
