import { z } from "zod";

import type { AnimeCreate, AnimePatch, CandidateDraft } from "@/domain";
import {
  httpUrl,
  integerBetween,
  nullableIntegerBetween,
  numberBetween,
  offsetDateTime,
  optionalNullableHttpUrl,
  optionalNullableText,
  parseWithSchema,
  requiredText,
} from "./schema";

const animeFields = {
  titleZh: requiredText(1_000, "titleZh"),
  titleZhSourceUrl: optionalNullableHttpUrl("titleZhSourceUrl"),
  titleJa: requiredText(1_000, "titleJa"),
  titleEn: optionalNullableText(1_000, "titleEn"),
  synopsis: requiredText(8_000, "synopsis"),
  editorialNote: optionalNullableText(8_000, "editorialNote"),
  studio: optionalNullableText(1_000, "studio"),
  sourceMaterial: optionalNullableText(1_000, "sourceMaterial"),
  officialUrl: optionalNullableHttpUrl("officialUrl"),
  bangumiUrl: optionalNullableHttpUrl("bangumiUrl"),
  officialXUrl: optionalNullableHttpUrl("officialXUrl"),
  coverUrl: optionalNullableHttpUrl("coverUrl"),
  coverSourceUrl: optionalNullableHttpUrl("coverSourceUrl"),
  mainCharacterSourceUrl: optionalNullableHttpUrl("mainCharacterSourceUrl"),
  mainCharacterExpectedCount: nullableIntegerBetween(1, 200, "mainCharacterExpectedCount").optional(),
  mainCharacterCheckedAt: optionalNullableText(60, "mainCharacterCheckedAt").refine(
    (value) => value === null || value === undefined || Number.isFinite(Date.parse(value)),
    "mainCharacterCheckedAt 不是有效日期时间。",
  ),
  premiereAt: offsetDateTime("premiereAt"),
  visualTheme: requiredText(40, "visualTheme").regex(/^[a-z][a-z0-9-]*$/, "visualTheme 格式不正确。"),
  episodeCount: nullableIntegerBetween(1, 1_000, "episodeCount").optional(),
  episodeDurationMin: nullableIntegerBetween(1, 300, "episodeDurationMin").optional(),
  premiereEpisodeCount: integerBetween(1, 1_000, "premiereEpisodeCount").optional(),
  latestVerifiedEpisode: nullableIntegerBetween(1, 1_000, "latestVerifiedEpisode").optional(),
  latestEpisodeSourceUrl: optionalNullableHttpUrl("latestEpisodeSourceUrl"),
  latestEpisodeCheckedAt: optionalNullableText(60, "latestEpisodeCheckedAt").refine(
    (value) => value === null || value === undefined || Number.isFinite(Date.parse(value)),
    "latestEpisodeCheckedAt 不是有效日期时间。",
  ),
  featured: z.boolean("featured 必须是布尔值。"),
  yuriKind: z.enum(["canon", "strong", "adjacent"], "yuriKind 格式不正确。"),
  yuriStatus: z.enum(["confirmed", "pending"], "yuriStatus 格式不正确。"),
  status: z.enum(["airing", "upcoming", "finished", "paused"], "status 格式不正确。"),
};

const animePatchSchema = z.object(animeFields).partial();
const animeCreateSchema = z.object({
  seasonId: requiredText(120, "seasonId"),
  slug: requiredText(120, "slug").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 格式不正确。"),
  ...animeFields,
});

const candidateMediaSchema = z.object({
  contentClass: z.enum(["official_art", "creator_art", "fanart", "fan_video", "cosplay"]),
  title: requiredText(240, "media.title"),
  creatorName: requiredText(200, "media.creatorName"),
  creatorUrl: optionalNullableHttpUrl("media.creatorUrl"),
  originalUrl: httpUrl("media.originalUrl"),
  previewUrl: optionalNullableHttpUrl("media.previewUrl"),
  presentationMode: z.enum(["link_only", "platform_embed", "remote_preview", "mirrored_with_permission"]).optional(),
  safetyRating: z.enum(["safe", "suggestive", "adult", "unknown"]).optional(),
  spoilerLevel: z.enum(["none", "mild", "major"]).optional(),
  rightsNote: optionalNullableText(1_000, "media.rightsNote"),
});

export const candidateDraftSchema = z.object({
  observationId: optionalNullableText(160, "observationId"),
  claimId: optionalNullableText(160, "claimId"),
  animeId: optionalNullableText(100, "animeId"),
  animeIds: z.array(requiredText(100, "animeIds")).max(100, "候选最多关联 100 部作品。").optional(),
  personId: optionalNullableText(100, "personId"),
  characterId: optionalNullableText(100, "characterId"),
  accountId: optionalNullableText(100, "accountId"),
  platformObjectId: optionalNullableText(240, "platformObjectId"),
  originKey: optionalNullableText(500, "originKey"),
  contentClass: z.enum([
    "schedule", "official_news", "official_art", "creator_art", "birthday",
    "cast_post", "staff_post", "fanwork", "community_thread", "editorial",
  ], "未知的内容分类。"),
  sourceIdentity: z.enum(["official", "creator", "cast", "community", "editorial"], "未知的来源身份。"),
  title: requiredText(120, "title"),
  summary: requiredText(1_000, "summary"),
  url: httpUrl("url"),
  sourceName: requiredText(120, "sourceName"),
  sourceAccount: optionalNullableText(120, "sourceAccount"),
  importance: numberBetween(1, 5, "importance").default(2),
  publishedAt: offsetDateTime("publishedAt"),
  presentationMode: z.literal("link_only").default("link_only"),
  safetyRating: z.enum(["safe", "suggestive", "adult", "unknown"], "未知的安全分级。").default("unknown"),
  spoilerLevel: z.enum(["none", "mild", "major"], "未知的剧透分级。").default("none"),
  confidence: numberBetween(0, 1, "confidence").default(0.5),
  discoveredBy: requiredText(60, "discoveredBy").default("admin"),
  extractorVersion: requiredText(120, "extractorVersion").optional(),
  policyVersion: requiredText(120, "policyVersion").optional(),
  media: candidateMediaSchema.optional(),
});

export function parseAnimePatch(input: unknown): AnimePatch {
  return parseWithSchema(animePatchSchema, input);
}

export function parseAnimeCreate(input: unknown): AnimeCreate {
  return parseWithSchema(animeCreateSchema, input);
}

export function parseCandidateDraft(input: unknown): CandidateDraft {
  return parseWithSchema(candidateDraftSchema, input);
}
