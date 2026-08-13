import { z } from "zod";

import type { SourceCheckWrite } from "@/domain";
import { nullableText, offsetDateTime, parseWithSchema, requiredText } from "./schema";

const sourceCheckSchema = z.object({
  sourceId: requiredText(160, "sourceId"),
  checkedAt: offsetDateTime("checkedAt").transform((value) => new Date(value).toISOString()),
  outcome: z.enum(["success", "failure"], "outcome 格式不正确。"),
  etag: nullableText(512, "etag").default(null),
  lastModified: nullableText(256, "lastModified").default(null),
  error: nullableText(800, "error").default(null),
}).refine((value) => value.outcome !== "failure" || Boolean(value.error), {
  message: "失败检查需要 error。",
  path: ["error"],
});

const sourceChecksSchema = z.object({
  checks: z.array(sourceCheckSchema).max(100, "checks 必须是至多 100 条的数组。"),
}).refine(
  (value) => new Set(value.checks.map((check) => check.sourceId)).size === value.checks.length,
  "同一批次不能重复 sourceId。",
).transform((value) => value.checks);

export type SourceChecksRequest = z.input<typeof sourceChecksSchema>;

export function parseSourceChecks(input: unknown): SourceCheckWrite[] {
  return parseWithSchema(sourceChecksSchema, input);
}
