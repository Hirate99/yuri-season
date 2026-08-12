import type { LlmReview, ReviewContext } from "./types";

export const POLICY_VERSION = "publish-policy@1";

export type PolicyResult = {
  decision: LlmReview["decision"];
  reasons: string[];
};

export function applyReviewPolicy(context: ReviewContext, review: LlmReview): PolicyResult {
  const reasons = [...review.reasons];
  if (review.contentClass === "fanwork") {
    return { decision: "hold", reasons: [...reasons, "新发现同人必须由 Admin 复核原作者、分级与作品关联"] };
  }
  if (review.safetyRating === "adult" || review.safetyRating === "unknown") {
    return { decision: "hold", reasons: [...reasons, "安全分级需要人工复核"] };
  }
  if (review.spoilerLevel === "major") {
    return { decision: "hold", reasons: [...reasons, "重大剧透不自动发布"] };
  }
  if (context.hasMedia && context.presentationMode !== "link_only" && context.sourceTrust === "unverified") {
    return { decision: "hold", reasons: [...reasons, "未验证来源只允许外链展示"] };
  }
  if (context.hasMedia && !context.creatorName) {
    return { decision: "hold", reasons: [...reasons, "媒体内容缺少作者署名"] };
  }
  const threshold = context.sourceTrust === "official" ? 0.82 : context.hasMedia ? 0.9 : 0.88;
  if (review.confidence < threshold) {
    return { decision: "hold", reasons: [...reasons, `置信度低于 ${threshold}`] };
  }
  return { decision: review.decision, reasons };
}
