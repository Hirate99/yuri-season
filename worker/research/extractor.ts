import type { CandidateDraft, ContentClass, SafetyRating, SpoilerLevel } from "@/domain";
import type { NormalizedSource, SourceRecord } from "./types";
import { runJsonModel } from "./model";

export const EXTRACTOR_VERSION = "feed-extractor@1";

function sourceIdentity(source: SourceRecord) {
  if (source.source_identity) return source.source_identity;
  if (source.trust_level === "official") return "official" as const;
  if (source.trust_level === "verified_creator") return "creator" as const;
  return "community" as const;
}

const CONTENT_CLASSES: ContentClass[] = [
  "schedule", "official_news", "official_art", "creator_art", "birthday",
  "cast_post", "staff_post", "fanwork", "community_thread", "editorial",
];
const SAFETY: SafetyRating[] = ["safe", "suggestive", "adult", "unknown"];
const SPOILERS: SpoilerLevel[] = ["none", "mild", "major"];

type Extracted = {
  relevant: boolean;
  contentClass: ContentClass;
  title: string;
  summary: string;
  importance: number;
  safetyRating: SafetyRating;
  spoilerLevel: SpoilerLevel;
  confidence: number;
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["relevant", "contentClass", "title", "summary", "importance", "safetyRating", "spoilerLevel", "confidence"],
  properties: {
    relevant: { type: "boolean" },
    contentClass: { type: "string", enum: CONTENT_CLASSES },
    title: { type: "string", maxLength: 90 },
    summary: { type: "string", maxLength: 280 },
    importance: { type: "integer", minimum: 1, maximum: 5 },
    safetyRating: { type: "string", enum: SAFETY },
    spoilerLevel: { type: "string", enum: SPOILERS },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
};

function validExtracted(value: Extracted): boolean {
  return CONTENT_CLASSES.includes(value.contentClass) &&
    SAFETY.includes(value.safetyRating) && SPOILERS.includes(value.spoilerLevel) &&
    value.importance >= 1 && value.importance <= 5 && value.confidence >= 0 && value.confidence <= 1;
}

export async function extractCandidate(
  ai: Ai,
  source: SourceRecord,
  item: NormalizedSource,
  observationId: string,
): Promise<CandidateDraft | null> {
  const prompt = `你在为当季百合动画资讯站提取一条可公开索引的增量动态。
作品：${source.anime_title ?? "未绑定"}
来源：${source.label}（${source.trust_level}）
链接：${item.canonicalUrl}
标题：${item.title ?? "无"}
时间：${item.publishedAt ?? "来源未提供"}
证据正文：${item.excerpt.slice(0, 12_000)}

只依据证据判断是否与作品、作者、staff、cast、角色生日、公式贺图、同人作品或集中讨论串直接相关。导航、版权页、泛化宣传和无法确认的线索标记 relevant=false。标题与摘要使用简体中文，不添加证据中没有的日期、关系或评价。`;
  const extracted = await runJsonModel<Extracted>(ai, {
    prompt,
    schemaName: "yuri_feed_extraction",
    schema,
  });
  if (!extracted.relevant || !validExtracted(extracted)) return null;
  return {
    observationId,
    animeId: source.anime_id,
    contentClass: extracted.contentClass,
    sourceIdentity: sourceIdentity(source),
    title: extracted.title.trim(),
    summary: extracted.summary.trim(),
    url: item.canonicalUrl,
    sourceName: source.label,
    sourceAccount: item.authorName,
    importance: extracted.importance,
    publishedAt: item.publishedAt ?? new Date().toISOString(),
    presentationMode: "link_only",
    safetyRating: extracted.safetyRating,
    spoilerLevel: extracted.spoilerLevel,
    confidence: extracted.confidence,
    discoveredBy: "cron",
    extractorVersion: EXTRACTOR_VERSION,
  };
}
