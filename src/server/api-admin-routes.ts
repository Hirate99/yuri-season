import { z } from "zod";

import { parseAnimeCreate, parseAnimePatch, parseCandidateDraft } from "@worker/api/input";
import { parseResourceEnvelope, parseResourceKind, parseResourceWrite } from "@worker/api/resource-input";
import { parseWithSchema } from "@worker/api/schema";
import { parseSeasonWrite } from "@worker/api/season-input";
import { HttpError } from "@worker/http";
import { readAdminDashboard } from "@worker/repositories/admin";
import { createAdminResource, deleteAdminResource, updateAdminResource } from "@worker/repositories/admin-resource-mutations";
import { readAdminAnimeResources } from "@worker/repositories/admin-resources";
import { applyCandidateDecision, createAnime, createCandidate, patchAnime } from "@worker/repositories/mutations";
import { createSeason, updateSeason } from "@worker/repositories/season-mutations";
import type { ApiApp } from "./api-shared";
import { jsonInput } from "./api-shared";

const decisionSchema = z.object({
  decision: z.enum(["publish", "hold", "reject", "withdraw"], "未知的审核决定。"),
  reason: z.string().trim().max(300).default(""),
}).refine((value) => value.decision !== "withdraw" || value.reason.length > 0, {
  message: "撤回需要填写 reason。",
  path: ["reason"],
});

export function registerAdminRoutes(api: ApiApp): void {
  api.get("/api/admin/dashboard", async (context) => context.json(await readAdminDashboard(context.env.DB)));

  api.post("/api/admin/anime", async (context) => {
    const value = await jsonInput(context, parseAnimeCreate);
    return context.json({ id: await createAnime(context.env.DB, value) }, 201);
  });

  api.patch("/api/admin/anime/:id", async (context) => {
    await patchAnime(context.env.DB, context.req.param("id"), await jsonInput(context, parseAnimePatch));
    return context.json({ ok: true });
  });

  api.get("/api/admin/anime/:id/resources", async (context) =>
    context.json(await readAdminAnimeResources(context.env.DB, context.req.param("id"))));

  api.post("/api/admin/anime/:id/resources", async (context) => {
    const id = await createAdminResource(
      context.env.DB,
      context.req.param("id"),
      await jsonInput(context, parseResourceEnvelope),
    );
    return context.json({ id }, 201);
  });

  api.patch("/api/admin/anime/:animeId/resources/:kind/:id", async (context) => {
    const kind = parseResourceKind(context.req.param("kind"));
    await updateAdminResource(
      context.env.DB,
      context.req.param("animeId"),
      kind,
      context.req.param("id"),
      await jsonInput(context, (input) => parseResourceWrite(kind, input)),
    );
    return context.json({ ok: true });
  });

  api.delete("/api/admin/anime/:animeId/resources/:kind/:id", async (context) => {
    const kind = parseResourceKind(context.req.param("kind"));
    if (kind === "source") throw new HttpError(400, "请停用来源，不直接删除历史来源。");
    await deleteAdminResource(context.env.DB, context.req.param("animeId"), kind, context.req.param("id"));
    return context.body(null, 204);
  });

  api.post("/api/admin/seasons", async (context) => {
    const id = await createSeason(context.env.DB, await jsonInput(context, parseSeasonWrite));
    return context.json({ id }, 201);
  });

  api.patch("/api/admin/seasons/:id", async (context) => {
    await updateSeason(context.env.DB, context.req.param("id"), await jsonInput(context, parseSeasonWrite));
    return context.json({ ok: true });
  });

  api.post("/api/admin/candidates", async (context) => {
    const id = await createCandidate(context.env.DB, await jsonInput(context, parseCandidateDraft));
    return context.json({ id }, 201);
  });

  api.post("/api/admin/candidates/:id/decision", async (context) => {
    const input = await jsonInput(context, (value) => parseWithSchema(decisionSchema, value));
    await applyCandidateDecision(context.env.DB, context.req.param("id"), input.decision, {
      reviewerType: "admin",
      reasons: input.reason ? [input.reason] : [],
    });
    return context.json({ ok: true });
  });
}
