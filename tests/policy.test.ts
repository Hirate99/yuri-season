import { describe, expect, test } from "bun:test";
import { applyReviewPolicy } from "~/research/policy";
import type { LlmReview, ReviewContext } from "~/research/types";

const context: ReviewContext = {
  candidateId: "candidate-1",
  animeTitle: "测试作品",
  sourceLabel: "动画公式",
  sourceTrust: "official",
  sourceIdentity: "official",
  currentTitle: "公式公开新视觉",
  currentSummary: "公式公开了新视觉。",
  url: "https://example.com/news/1",
  excerpt: "新视觉公开",
  hasMedia: false,
  presentationMode: "link_only",
  creatorName: null,
};

const review: LlmReview = {
  decision: "publish",
  contentClass: "official_news",
  title: context.currentTitle,
  summary: context.currentSummary,
  importance: 3,
  safetyRating: "safe",
  spoilerLevel: "none",
  confidence: 0.94,
  reasons: ["公式来源"],
};

describe("publication policy", () => {
  test("allows a high-confidence official item", () => {
    expect(applyReviewPolicy(context, review).decision).toBe("publish");
  });

  test("holds unknown safety regardless of model decision", () => {
    expect(applyReviewPolicy(context, { ...review, safetyRating: "unknown" }).decision).toBe("hold");
  });

  test("holds major spoilers", () => {
    expect(applyReviewPolicy(context, { ...review, spoilerLevel: "major" }).decision).toBe("hold");
  });

  test("uses a stricter threshold for unverified sources", () => {
    expect(applyReviewPolicy({ ...context, sourceTrust: "unverified" }, { ...review, confidence: 0.87 }).decision).toBe("hold");
  });

  test("always holds newly discovered fanwork", () => {
    expect(applyReviewPolicy(context, {
      ...review,
      contentClass: "fanwork",
      confidence: 0.99,
      decision: "publish",
    }).decision).toBe("hold");
  });
});
