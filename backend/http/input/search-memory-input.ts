import { z } from "zod";

import { httpUrl, jsonObject, nullableText, offsetDateTime, requiredText } from "./schema";

const nullableTimestamp = (label: string) =>
  nullableText(60, label).refine(
    (value) => value === null || z.iso.datetime({ offset: true }).safeParse(value).success,
    `${label} 格式不正确。`,
  );

const nonNegativeInteger = (label: string) => z.number(`${label} 必须是数字。`).int().nonnegative();

const hitSchema = z.object({
  canonicalUrl: httpUrl("canonicalUrl"),
  title: nullableText(300, "title").default(null),
  contentHash: nullableText(128, "contentHash").default(null),
  outcome: z
    .enum(["seen", "candidate", "published", "held", "rejected", "ignored"], "outcome 格式不正确。")
    .default("seen"),
  observationId: nullableText(160, "observationId").optional(),
  candidateId: nullableText(160, "candidateId").optional(),
  metadata: jsonObject.default({}),
});

const memorySchema = z.object({
  scopeType: z.enum(
    ["season", "anime", "person", "character", "source", "global"],
    "scopeType 格式不正确。",
  ),
  scopeId: requiredText(160, "scopeId"),
  searchKind: z.enum(
    ["registered_source", "official_news", "social", "birthday", "media", "community", "catalog"],
    "searchKind 格式不正确。",
  ),
  targetKey: requiredText(500, "targetKey"),
  queryText: requiredText(2_000, "queryText"),
  status: z.enum(["active", "exhausted", "blocked"], "status 格式不正确。").default("active"),
  cursor: jsonObject.default({}),
  lastResultHash: nullableText(128, "lastResultHash").default(null),
  lastResultCount: nonNegativeInteger("lastResultCount"),
  usefulResultCount: nonNegativeInteger("usefulResultCount"),
  searchedAt: offsetDateTime("searchedAt"),
  nextSearchAt: nullableTimestamp("nextSearchAt").default(null),
  notes: nullableText(1_000, "notes").default(null),
  hits: z.array(hitSchema).max(100, "每条 memory 最多 100 个 hit。"),
});

export const searchMemoryBatchSchema = z
  .object({
    records: z.array(memorySchema).max(100, "records 必须是至多 100 条的数组。"),
  })
  .transform((value) => value.records);
