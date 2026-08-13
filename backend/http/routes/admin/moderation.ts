import { Hono } from "hono";
import { z } from "zod";

import type { CandidateDraft } from "@/domain";
import { parseCandidateDraft } from "~/http/input/anime-input";
import { parseWithSchema } from "~/http/input/schema";
import type { ApiEnvironment } from "../../shared";
import { invalidatePublicData, validatedJson } from "../../shared";

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

type DecisionInput = z.input<typeof decisionSchema>;
type DecisionValue = z.output<typeof decisionSchema>;
type DeleteReasonInput = z.input<typeof deleteReasonSchema>;
type DeleteReason = z.output<typeof deleteReasonSchema>;

export const moderationRoutes = new Hono<ApiEnvironment>()
  .delete(
    "/discussions/:id",
    validatedJson<DeleteReasonInput, DeleteReason>((value) => parseWithSchema(deleteReasonSchema, value)),
    async (context) => {
      await context.var.services.admin.discussions.delete(
        context.req.param("id"),
        context.req.valid("json").reason,
      );
      await invalidatePublicData(context);
      return context.body(null, 204);
    },
  )
  .post("/candidates", validatedJson<CandidateDraft>(parseCandidateDraft), async (context) => {
    const id = await context.var.services.admin.candidates.create(context.req.valid("json"));
    return context.json({ id }, 201);
  })
  .post(
    "/candidates/:id/decision",
    validatedJson<DecisionInput, DecisionValue>((value) => parseWithSchema(decisionSchema, value)),
    async (context) => {
      const input = context.req.valid("json");
      await context.var.services.admin.candidates.decide(context.req.param("id"), input.decision, input.reason);
      await invalidatePublicData(context);
      return context.json({ ok: true });
    },
  );
