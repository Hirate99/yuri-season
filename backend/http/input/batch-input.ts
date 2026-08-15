import { z } from "zod";

import type { ResearchBatch } from "@/domain";
import { candidateDraftSchema } from "./anime-input";
import {
  httpUrl,
  integerBetween,
  jsonObject,
  nullableHttpUrl,
  nullableText,
  numberBetween,
  offsetDateTime,
  optionalNullableText,
  parseWithSchema,
  requiredText,
  temporal,
} from "./schema";

const reviewSchema = z.object({
  decision: z.enum(["publish", "hold", "reject"]),
  confidence: numberBetween(0, 1, "review.confidence"),
  reasons: z.array(requiredText(500, "review.reason")).max(20),
  model: requiredText(120, "review.model").optional(),
  promptVersion: requiredText(120, "review.promptVersion").optional(),
});

const candidateSchema = candidateDraftSchema.extend({
  review: reviewSchema,
});

const inlineSourceSchema = z.object({
  sourceType: z.enum(["social", "community"]),
  label: requiredText(200, "source.label"),
  url: httpUrl("source.url"),
  trustLevel: z.enum(["community", "unverified"]),
});

const accountDiscoverySchema = z.object({
  animeId: requiredText(120, "accountDiscovery.animeId"),
  personId: requiredText(120, "accountDiscovery.personId"),
  platform: z.enum(["X", "Instagram"]),
  handle: optionalNullableText(160, "accountDiscovery.handle"),
  url: httpUrl("accountDiscovery.url"),
  verificationSourceUrl: httpUrl("accountDiscovery.verificationSourceUrl"),
  review: reviewSchema,
});

const socialPostHosts = new Set([
  "x.com",
  "twitter.com",
  "instagram.com",
  "bsky.app",
  "threads.net",
]);

function isSocialPostUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!socialPostHosts.has(host)) return false;
  if (host === "x.com" || host === "twitter.com") return /^\/[^/]+\/status\/[^/]+/.test(url.pathname);
  if (host === "instagram.com") return /^\/(p|reel|tv)\/[^/]+/.test(url.pathname);
  if (host === "bsky.app") return /^\/profile\/[^/]+\/post\/[^/]+/.test(url.pathname);
  if (host === "threads.net") return /^\/@[^/]+\/post\/[^/]+/.test(url.pathname);
  return false;
}

const themeSongSchema = z.object({
  animeId: requiredText(120, "themeSong.animeId"),
  songKind: z.enum(["opening", "ending", "theme", "insert", "image"]),
  sequence: integerBetween(1, 99, "themeSong.sequence"),
  title: requiredText(300, "themeSong.title"),
  artist: requiredText(300, "themeSong.artist"),
  lyricist: nullableText(300, "themeSong.lyricist").default(null),
  composer: nullableText(300, "themeSong.composer").default(null),
  arranger: nullableText(300, "themeSong.arranger").default(null),
  episodeRange: nullableText(120, "themeSong.episodeRange").default(null),
  officialUrl: nullableHttpUrl("themeSong.officialUrl").default(null),
  coverUrl: nullableHttpUrl("themeSong.coverUrl").default(null),
  coverSourceUrl: nullableHttpUrl("themeSong.coverSourceUrl").default(null),
  sortOrder: integerBetween(0, 10_000, "themeSong.sortOrder"),
  review: reviewSchema,
}).refine((value) => !value.coverUrl || Boolean(value.coverSourceUrl), {
  message: "主题曲封面必须保留图片来源。",
  path: ["coverSourceUrl"],
});

const baseObservationSchema = z.object({
  sourceId: optionalNullableText(120, "sourceId"),
  accountId: optionalNullableText(120, "accountId"),
  source: inlineSourceSchema.nullable().optional(),
  sourceItemId: optionalNullableText(240, "sourceItemId"),
  canonicalUrl: httpUrl("canonicalUrl"),
  title: optionalNullableText(300, "title"),
  excerpt: requiredText(24_000, "excerpt"),
  publicText: optionalNullableText(24_000, "publicText"),
  publicTranslation: optionalNullableText(24_000, "publicTranslation"),
  mediaDisposition: z.enum(["none", "attached", "unavailable", "link_only_policy"]).optional(),
  mediaDispositionReason: optionalNullableText(1_000, "mediaDispositionReason"),
  authorName: optionalNullableText(200, "authorName"),
  publishedAt: temporal("publishedAt").optional(),
  contentType: requiredText(120, "contentType").optional(),
  language: optionalNullableText(40, "language"),
  metadata: jsonObject.default({}),
  candidates: z.array(candidateSchema).max(10, "每条 observation 最多包含 10 条候选。"),
  accountDiscoveries: z.array(accountDiscoverySchema).max(8).optional(),
  themeSongs: z.array(themeSongSchema).max(8).optional(),
}).refine(
  (value) => [value.sourceId, value.accountId, value.source].filter((item) => item != null).length === 1,
  "每条 observation 必须且只能提供 sourceId、accountId 或内联 source 中的一种。",
);

const observationSchema = baseObservationSchema.superRefine((value, context) => {
  const publishesSocialPost = isSocialPostUrl(value.canonicalUrl)
    && value.candidates.some((candidate) => candidate.review.decision === "publish");
  if (publishesSocialPost && !value.publicText) {
    context.addIssue({
      code: "custom",
      message: "自动发布社交帖子必须保存原帖正文 publicText；无法保存正文时只能 hold 或 reject。",
      path: ["publicText"],
    });
  }
  if (publishesSocialPost && !value.mediaDisposition) {
    context.addIssue({
      code: "custom",
      message: "自动发布社交帖子必须声明 mediaDisposition，明确原帖是否包含媒体及其处理结果。",
      path: ["mediaDisposition"],
    });
  }
  if (publishesSocialPost && value.mediaDisposition === "attached") {
    value.candidates.forEach((candidate, index) => {
      if (candidate.review.decision === "publish" && !candidate.media?.assets?.length) {
        context.addIssue({
          code: "custom",
          message: "mediaDisposition=attached 的自动发布社交帖子必须包含已上传的 media.assets。",
          path: ["candidates", index, "media", "assets"],
        });
      }
    });
  }
  if (publishesSocialPost
    && (value.mediaDisposition === "unavailable" || value.mediaDisposition === "link_only_policy")
    && !value.mediaDispositionReason) {
    context.addIssue({
      code: "custom",
      message: "媒体不可用或仅链接展示时必须记录 mediaDispositionReason。",
      path: ["mediaDispositionReason"],
    });
  }
});

const researchBatchSchema = z.object({
  schemaVersion: z.literal("1", "不支持这个 batch 版本。"),
  batchId: requiredText(160, "batchId"),
  createdAt: offsetDateTime("createdAt"),
  agent: requiredText(120, "agent"),
  scope: requiredText(240, "scope"),
  note: requiredText(1_000, "note").optional(),
  observations: z.array(observationSchema).max(100, "observations 必须是至多 100 条的数组。"),
});

export function parseResearchBatch(input: unknown): ResearchBatch {
  return parseWithSchema(researchBatchSchema, input);
}
