import { describe, expect, test } from "bun:test";
import { fetchSource } from "~/research/source-fetcher";
import type { SourceRecord } from "~/research/types";

const source: SourceRecord = {
  id: "source-large-official-news",
  animeId: "anime-test",
  animeTitle: "测试作品",
  sourceType: "official_json",
  changeKind: "feed_candidate",
  label: "动画公式 NEWS",
  url: "https://example.test/api/site-data/init",
  itemUrlTemplate: "https://example.test/news/{id}/",
  trustLevel: "official",
  cadenceProfile: "local",
  pollIntervalMin: 720,
  etag: null,
  lastModified: null,
  cursor: null,
};

describe("bounded source fetching", () => {
  test("accepts a structured official news payload larger than the old 128 KB limit", async () => {
    const payload = JSON.stringify({
      news: Array.from({ length: 24 }, (_, index) => ({
        id: `news-${index}`,
        title: `公式消息 ${index}`,
        body: `<p>${"内容".repeat(1_000)}</p>`,
        date: "2026-08-11T12:00:00+09:00",
        status: "publish",
      })),
    });
    expect(new TextEncoder().encode(payload).byteLength).toBeGreaterThan(128_000);
    expect(new TextEncoder().encode(payload).byteLength).toBeLessThan(256_000);

    const result = await fetchSource(source, async () => new Response(payload, {
      headers: { "content-type": "application/json" },
    }));

    expect(result.items).toHaveLength(24);
    expect(result.items[0].canonicalUrl).toBe("https://example.test/news/news-0/");
  });
});
