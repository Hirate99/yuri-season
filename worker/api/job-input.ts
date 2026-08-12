import { z } from "zod";

import type { LocalJobOutcome } from "@/domain";
import { integerBetween, jsonObject, nullableText, parseWithSchema, requiredText } from "./schema";

export type LeaseLocalJobsInput = { owner: string; limit: number };
export type HeartbeatLocalJobInput = { leaseToken: string };
export type CompleteLocalJobInput = {
  leaseToken: string;
  idempotencyKey: string;
  outcome: LocalJobOutcome;
  runId: string | null;
  message: string | null;
  result: Record<string, unknown>;
};

const leaseSchema = z.object({
  owner: requiredText(120, "owner").regex(/^[a-zA-Z0-9._:@/-]+$/, "owner 格式不正确。").default("codex-local"),
  limit: integerBetween(1, 3, "limit").default(1),
});

const heartbeatSchema = z.object({ leaseToken: requiredText(200, "leaseToken") });

const completeSchema = z.object({
  leaseToken: requiredText(200, "leaseToken"),
  idempotencyKey: requiredText(160, "idempotencyKey"),
  outcome: z.enum(["completed", "partial", "failed"], "outcome 格式不正确。"),
  runId: nullableText(120, "runId").default(null),
  message: nullableText(800, "message").default(null),
  result: jsonObject.refine((value) => JSON.stringify(value).length <= 16_000, "result 过长。").default({}),
}).refine((value) => value.outcome !== "failed" || Boolean(value.message), {
  message: "失败任务需要 message。",
  path: ["message"],
});

export function parseLeaseLocalJobs(input: unknown): LeaseLocalJobsInput {
  return parseWithSchema(leaseSchema, input);
}

export function parseHeartbeatLocalJob(input: unknown): HeartbeatLocalJobInput {
  return parseWithSchema(heartbeatSchema, input);
}

export function parseCompleteLocalJob(input: unknown): CompleteLocalJobInput {
  return parseWithSchema(completeSchema, input);
}
