import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { searchMemoryBatchSchema } from "~/http/input/search-memory-input";
import { readSearchMemory, rememberSearch } from "~/repositories/search-memory";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

function batch(outcome: "seen" | "published" = "seen") {
  return searchMemoryBatchSchema.parse({
    records: [
      {
        scopeType: "source",
        scopeId: "source-kimi-news",
        searchKind: "registered_source",
        targetKey: "https://example.com/news/",
        queryText: "https://example.com/news/",
        status: "active",
        cursor: {},
        lastResultHash: "abc",
        lastResultCount: 1,
        usefulResultCount: outcome === "seen" ? 0 : 1,
        searchedAt: "2026-08-11T20:00:00Z",
        nextSearchAt: "2026-08-18T20:00:00Z",
        hits: [
          {
            canonicalUrl: "https://example.com/news/1",
            title: "公式更新",
            contentHash: "item-1",
            outcome,
            metadata: { sourceItemId: "1" },
          },
        ],
      },
    ],
  });
}

describe("search memory", () => {
  test("remembers seen URLs and does not downgrade a resolved outcome", async () => {
    const [published] = batch("published");
    published.hits = Array.from({ length: 100 }, (_, index) => ({
      ...published.hits[0],
      canonicalUrl: `https://example.com/news/${index}`,
    }));
    database.resetMetrics();
    await rememberSearch(database.binding(), [published]);
    expect(database.calls).toBe(1);
    expect(database.executedStatements).toBe(101);
    await rememberSearch(database.binding(), batch("seen"));

    const records = await readSearchMemory(database.binding());
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      scopeId: "source-kimi-news",
      publishedCount: 100,
      seenCount: 0,
    });
    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM search_memory_hits").get()).toEqual(
      { count: 100 },
    );

    database.exec(
      "CREATE TRIGGER reject_hit BEFORE INSERT ON search_memory_hits WHEN NEW.canonical_url LIKE '%failure' BEGIN SELECT RAISE(ABORT, 'hit unavailable'); END;",
    );
    await expect(
      rememberSearch(database.binding(), [
        {
          ...published,
          notes: "must roll back",
          hits: [
            { ...published.hits[0], canonicalUrl: "https://example.com/new" },
            { ...published.hits[0], canonicalUrl: "https://example.com/failure" },
          ],
        },
      ]),
    ).rejects.toThrow("hit unavailable");
    expect(await readSearchMemory(database.binding())).toEqual(records);
  });

  test("rejects non-http hit URLs", () => {
    const input = batch("seen")[0];
    expect(() =>
      searchMemoryBatchSchema.parse({
        records: [
          {
            ...input,
            hits: [{ ...input.hits[0], canonicalUrl: "javascript:alert(1)" }],
          },
        ],
      }),
    ).toThrow("只支持 HTTP(S)");
  });
});
