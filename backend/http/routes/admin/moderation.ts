import { Hono } from "hono";
import { z } from "zod";

import { candidateDraftSchema } from "@/domain/inputs/anime";
import type { ApiEnvironment } from "~/http/shared";
import { validate } from "~/http/shared";

const decisionSchema = z.object({
  decision: z.enum(["publish", "hold", "reject", "withdraw"], "未知的审核决定。"),
  reason: z.string().trim().max(300).default(""),
}).refine((value) => value.decision !== "withdraw" || value.reason.length > 0, {
  message: "撤回需要填写 reason。",
  path: ["reason"],
});

const deleteReasonSchema = z.object({
  reason: z.string().trim().min(1, "彻底删除需要填写原因。").max(300),
});

export const moderationRoutes = new Hono<ApiEnvironment>()
  .delete(
    "/discussions/:id",
    validate("json", deleteReasonSchema),
    async (context) => {
      await context.var.services.admin.discussions.delete(
        context.req.param("id"),
        context.req.valid("json").reason,
      );
      return context.body(null, 204);
    },
  )
  .post("/candidates", validate("json", candidateDraftSchema), async (context) => {
    const id = await context.var.services.admin.candidates.create(context.req.valid("json"));
    return context.json({ id }, 201);
  })
  .post(
    "/candidates/:id/decision",
    validate("json", decisionSchema),
    async (context) => {
      const input = context.req.valid("json");
      await context.var.services.admin.candidates.decide(context.req.param("id"), input.decision, input.reason);
      return context.json({ ok: true });
    },
  );
