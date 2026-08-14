import { describe, expect, test } from "bun:test";
import {
  partitionSourceChanges,
  sourceChangeKind,
  type SourceChange,
} from "../scripts/lib/source-change";
import { changedItems, isReusableSourceState } from "../scripts/lib/source-state";

describe("incremental source diff", () => {
  const item = (contentHash: string) => ({ contentHash, title: contentHash });

  test("treats a first observation as a baseline without creating model work", () => {
    expect(changedItems(undefined, [item("a"), item("b")])).toEqual([]);
  });

  test("returns no work for an unchanged source", () => {
    expect(changedItems(["a", "b"], [item("a"), item("b")])).toEqual([]);
  });

  test("returns only new or edited fingerprints", () => {
    expect(changedItems(["a", "b"], [item("a"), item("b-edited"), item("c")]).map((value) => value.contentHash))
      .toEqual(["b-edited", "c"]);
  });
});

describe("source state compatibility", () => {
  test("rebaselines legacy community state after its normalizer changes", () => {
    expect(isReusableSourceState({ normalizerVersion: undefined }, "community", "community-thread@1")).toBe(false);
    expect(isReusableSourceState({ normalizerVersion: "community-thread@1" }, "community", "community-thread@1")).toBe(true);
    expect(isReusableSourceState({ normalizerVersion: undefined }, "official_page", "generic@1")).toBe(true);
  });
});

describe("source change routing", () => {
  test("routes Bangumi metadata away from feed extraction", () => {
    expect(sourceChangeKind(undefined, "bangumi")).toBe("catalog_metadata");
    expect(sourceChangeKind(undefined, "official_page")).toBe("feed_candidate");
    expect(sourceChangeKind("catalog_metadata", "official_page")).toBe("catalog_metadata");
    expect(sourceChangeKind("feed_candidate", "community")).toBe("feed_candidate");
  });

  test("partitions one fetched batch without losing traceability", () => {
    const change = (kind: SourceChange["kind"], sourceId: string): SourceChange => ({
      kind,
      sourceId,
      sourceType: kind === "catalog_metadata" ? "bangumi" : "official_page",
      animeTitle: "Example",
      sourceLabel: "Example source",
      trustLevel: "official",
      item: {
        sourceItemId: "1",
        canonicalUrl: "https://example.com/1",
        title: "Example",
        excerpt: "Example",
        publicText: null,
        authorName: null,
        publishedAt: null,
        contentHash: sourceId,
        contentType: "text/plain",
        language: null,
        metadata: {},
      },
    });

    const result = partitionSourceChanges([
      change("catalog_metadata", "catalog"),
      change("feed_candidate", "feed"),
    ]);

    expect(result.catalogChanges.map((item) => item.sourceId)).toEqual(["catalog"]);
    expect(result.feedChanges.map((item) => item.sourceId)).toEqual(["feed"]);
  });
});
