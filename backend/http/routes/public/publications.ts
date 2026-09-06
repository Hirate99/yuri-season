import { Hono } from "hono";

import { HttpError } from "~/shared/http-error";
import type { ApiEnvironment } from "~/http/shared";
import { publicJson } from "~/http/shared";

export const publicationRoutes = new Hono<ApiEnvironment>().get("/updates/:id", async (context) => {
  const id = context.req.param("id");
  const page = await context.var.services.public.publications.page(id);
  if (!page) throw new HttpError(404, "没有找到这条情报。");

  return publicJson(context, page);
});
