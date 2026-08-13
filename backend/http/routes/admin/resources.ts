import { Hono } from "hono";

import type { AdminResourceWrite } from "@/domain";
import { parseResourceEnvelope, parseResourceKind, parseResourceWrite } from "~/http/input/resource-input";
import { HttpError } from "~/shared/http-error";
import type { ApiEnvironment } from "../../shared";
import { invalidatePublicData, validatedJson } from "../../shared";

export const resourceRoutes = new Hono<ApiEnvironment>()
  .get("/anime/:id/resources", async (context) =>
    context.json(await context.var.services.admin.resources.list(context.req.param("id"))))
  .post("/anime/:id/resources", validatedJson<AdminResourceWrite>(parseResourceEnvelope), async (context) => {
    const id = await context.var.services.admin.resources.create(
      context.req.param("id"),
      context.req.valid("json"),
    );
    await invalidatePublicData(context);
    return context.json({ id }, 201);
  })
  .patch(
    "/anime/:animeId/resources/:kind/:id",
    validatedJson<AdminResourceWrite["value"], AdminResourceWrite>((input, context) =>
      parseResourceWrite(parseResourceKind(context.req.param("kind")!), input)),
    async (context) => {
      const kind = parseResourceKind(context.req.param("kind"));
      await context.var.services.admin.resources.update(
        context.req.param("animeId"),
        kind,
        context.req.param("id"),
        context.req.valid("json"),
      );
      await invalidatePublicData(context);
      return context.json({ ok: true });
    },
  )
  .delete("/anime/:animeId/resources/:kind/:id", async (context) => {
    const kind = parseResourceKind(context.req.param("kind"));
    if (kind === "source") throw new HttpError(400, "请停用来源，不直接删除历史来源。");
    await context.var.services.admin.resources.delete(
      context.req.param("animeId"),
      kind,
      context.req.param("id"),
    );
    await invalidatePublicData(context);
    return context.body(null, 204);
  });
