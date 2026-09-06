import { z } from "zod";

import { integerBetween, jsonObject, nullableText, requiredText } from "./schema";

export const leaseLocalJobsSchema = z.object({
  owner: requiredText(120, "owner")
    .regex(/^[a-zA-Z0-9._:@/-]+$/, "owner 格式不正确。")
    .default("codex-local"),
  limit: integerBetween(1, 3, "limit").default(1),
});

export const heartbeatLocalJobSchema = z.object({ leaseToken: requiredText(200, "leaseToken") });

export const completeLocalJobSchema = z
  .object({
    leaseToken: requiredText(200, "leaseToken"),
    idempotencyKey: requiredText(160, "idempotencyKey"),
    outcome: z.enum(["completed", "partial", "failed"], "outcome 格式不正确。"),
    runId: nullableText(120, "runId").default(null),
    message: nullableText(800, "message").default(null),
    result: jsonObject
      .refine((value) => JSON.stringify(value).length <= 16_000, "result 过长。")
      .default({}),
  })
  .refine((value) => value.outcome !== "failed" || Boolean(value.message), {
    message: "失败任务需要 message。",
    path: ["message"],
  });
