import { describe, expect, test } from "bun:test";

import { researchBatchSchema } from "~/http/input/batch-input";

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
      mediaDisposition: "none",
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
    expect(() => researchBatchSchema.parse(socialBatch("publish"))).toThrow(
      "自动发布社交帖子必须保存原帖正文 publicText",
    );
  });

  test("accepts an auto-published social post with original text", () => {
    expect(researchBatchSchema.parse(socialBatch("publish", "Original post text.")))
      .toMatchObject({ observations: [{ publicText: "Original post text." }] });
  });

  test("rejects an auto-published social post without an explicit media disposition", () => {
    const value = socialBatch("publish", "Original post text.");
    delete (value.observations[0] as { mediaDisposition?: string }).mediaDisposition;
    expect(() => researchBatchSchema.parse(value)).toThrow("必须声明 mediaDisposition");
  });

  test("requires uploaded assets when the original has attached media", () => {
    const value = socialBatch("publish", "Original post text.");
    value.observations[0].mediaDisposition = "attached";
    expect(() => researchBatchSchema.parse(value)).toThrow("必须包含已上传的 media.assets");
  });

  test("requires a reason for a media policy exception", () => {
    const value = socialBatch("publish", "Original post text.");
    value.observations[0].mediaDisposition = "link_only_policy";
    expect(() => researchBatchSchema.parse(value)).toThrow("必须记录 mediaDispositionReason");
  });

  test("requires a reviewed policy URL for link-only publication", () => {
    const value = socialBatch("publish", "Original post text.");
    value.observations[0].mediaDisposition = "link_only_policy";
    (value.observations[0] as typeof value.observations[0] & { mediaDispositionReason: string })
      .mediaDispositionReason = "平台不允许转载";
    expect(() => researchBatchSchema.parse(value)).toThrow("必须在理由中提供明确禁止转载");
  });

  test("allows a text-unavailable social post to remain held", () => {
    expect(researchBatchSchema.parse(socialBatch("hold")))
      .toMatchObject({ observations: [{ candidates: [{ review: { decision: "hold" } }] }] });
  });

  test("does not require social-post publicText on ordinary web pages", () => {
    const value = socialBatch("publish");
    value.observations[0].canonicalUrl = "https://example.com/news/1";
    value.observations[0].candidates[0].url = "https://example.com/news/1";
    expect(researchBatchSchema.parse(value)).toMatchObject({ batchId: "batch-social-publish" });
  });

  test("requires an explicit media disposition for published official pages", () => {
    const value = socialBatch("publish");
    value.observations[0].canonicalUrl = "https://example.com/news/1";
    value.observations[0].candidates[0].url = "https://example.com/news/1";
    delete (value.observations[0] as { mediaDisposition?: string }).mediaDisposition;
    expect(() => researchBatchSchema.parse(value)).toThrow("自动发布条目必须声明 mediaDisposition");
  });

  test("requires uploaded assets when a published official page declares attached media", () => {
    const value = socialBatch("publish");
    value.observations[0].canonicalUrl = "https://example.com/news/1";
    value.observations[0].candidates[0].url = "https://example.com/news/1";
    value.observations[0].mediaDisposition = "attached";
    expect(() => researchBatchSchema.parse(value)).toThrow("必须包含已上传的 media.assets");
  });
});
