import type { CandidateDraft } from "@/domain";
import { z } from "zod";
import { applyReviewPolicy, POLICY_VERSION } from "./policy";
import { REVIEW_MODEL, runJsonModel } from "./model";
import type { LlmReview, NormalizedSource, ReviewContext, SourceRecord } from "./types";

export const REVIEW_PROMPT_VERSION = "feed-review@1";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "contentClass", "title", "summary", "importance", "safetyRating", "spoilerLevel", "confidence", "reasons"],
  properties: {
    decision: { type: "string", enum: ["publish", "hold", "reject"] },
    contentClass: { type: "string", enum: ["schedule", "official_news", "official_art", "creator_art", "birthday", "cast_post", "staff_post", "fanwork", "community_thread", "editorial"] },
    title: { type: "string", minLength: 1, maxLength: 90 },
    summary: { type: "string", minLength: 1, maxLength: 280 },
    importance: { type: "integer", minimum: 1, maximum: 5 },
    safetyRating: { type: "string", enum: ["safe", "suggestive", "adult", "unknown"] },
    spoilerLevel: { type: "string", enum: ["none", "mild", "major"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reasons: { type: "array", maxItems: 6, items: { type: "string", minLength: 1, maxLength: 100 } },
  },
};

const reviewSchema = z.object({
  decision: z.enum(["publish", "hold", "reject"]),
  contentClass: z.enum(["schedule", "official_news", "official_art", "creator_art", "birthday", "cast_post", "staff_post", "fanwork", "community_thread", "editorial"]),
  title: z.string().trim().min(1).max(90),
  summary: z.string().trim().min(1).max(280),
  importance: z.number().int().min(1).max(5),
  safetyRating: z.enum(["safe", "suggestive", "adult", "unknown"]),
  spoilerLevel: z.enum(["none", "mild", "major"]),
  confidence: z.number().finite().min(0).max(1),
  reasons: z.array(z.string().trim().min(1).max(100)).max(6),
}).strict() satisfies z.ZodType<LlmReview>;

export async function reviewCandidate(
  ai: Ai,
  candidateId: string,
  draft: CandidateDraft,
  source: SourceRecord,
  item: NormalizedSource,
) {
  const prompt = `你是独立审核器，没有参与候选提取。请检查一条百合动画资讯候选是否被证据直接支持。
作品：${source.animeTitle ?? "未绑定"}
来源：${source.label}（可信级别 ${source.trustLevel}）
候选：${draft.title}\n${draft.summary}
候选分类：${draft.contentClass}
链接：${draft.url}
原始证据：${item.excerpt.slice(0, 12_000)}

publish 只用于事实清楚、与作品直接相关、摘要没有扩写、版权展示模式安全的内容；证据不足、可能剧透、作者身份或媒体分级不确定时 hold；明显无关或错误时 reject。`;
  const review = reviewSchema.parse(await runJsonModel(ai, {
    prompt,
    schemaName: "yuri_feed_review",
    schema,
  }));
  const context: ReviewContext = {
    candidateId,
    animeTitle: source.animeTitle,
    sourceLabel: source.label,
    sourceTrust: source.trustLevel,
    sourceIdentity: draft.sourceIdentity,
    currentTitle: draft.title,
    currentSummary: draft.summary,
    url: draft.url,
    excerpt: item.excerpt,
    hasMedia: Boolean(draft.media),
    presentationMode: draft.presentationMode ?? "link_only",
    creatorName: draft.media?.creatorName ?? null,
  };
  return {
    review,
    policy: applyReviewPolicy(context, review),
    model: REVIEW_MODEL,
    promptVersion: REVIEW_PROMPT_VERSION,
    policyVersion: POLICY_VERSION,
  };
}
