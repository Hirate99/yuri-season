import { describe, expect, test } from "bun:test";

import { parseResearchBatch } from "~/http/input/batch-input";

function socialBatch(decision: "publish" | "hold" | "reject", publicText?: string) {
  return {
    schemaVersion: "1",
    batchId: `batch-social-${decision}`,
    createdAt: "2026-08-14T21:30:00Z",
    agent: "codex/test",
    scope: "social post validation",
    observations: [{
      accountId: "account-test-x",
      sourceItemId: "2088253407593373725",
      canonicalUrl: "https://x.com/example/status/2088253407593373725",
      excerpt: "Close internal paraphrase.",
      publicText,
      publishedAt: "2026-08-14T13:16:24.000Z",
      candidates: [{
        animeId: "anime-test",
        accountId: "account-test-x",
        platformObjectId: "2088253407593373725",
        contentClass: "cast_post",
        sourceIdentity: "cast",
        title: "Test social post",
        summary: "Test social post summary.",
        url: "https://x.com/example/status/2088253407593373725",
        sourceName: "Example",
        publishedAt: "2026-08-14T13:16:24.000Z",
        presentationMode: "link_only",
        safetyRating: "safe",
        spoilerLevel: "none",
        confidence: 0.99,
        review: { decision, confidence: 0.99, reasons: ["test"] },
      }],
    }],
  };
}

describe("research batch social-post text invariant", () => {
  test("rejects an auto-published social post without original text", () => {
    expect(() => parseResearchBatch(socialBatch("publish"))).toThrow(
      "自动发布社交帖子必须保存原帖正文 publicText",
    );
  });

  test("accepts an auto-published social post with original text", () => {
    expect(parseResearchBatch(socialBatch("publish", "Original post text.")))
      .toMatchObject({ observations: [{ publicText: "Original post text." }] });
  });

  test("allows a text-unavailable social post to remain held", () => {
    expect(parseResearchBatch(socialBatch("hold")))
      .toMatchObject({ observations: [{ candidates: [{ review: { decision: "hold" } }] }] });
  });

  test("does not impose the social-post rule on ordinary web pages", () => {
    const value = socialBatch("publish");
    value.observations[0].canonicalUrl = "https://example.com/news/1";
    value.observations[0].candidates[0].url = "https://example.com/news/1";
    expect(parseResearchBatch(value)).toMatchObject({ batchId: "batch-social-publish" });
  });
});
