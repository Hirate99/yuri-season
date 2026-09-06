import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFeed, readMedia } from "~/repositories/feed";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("feed search", () => {
  test("searches feed copy, work titles and source identities", async () => {
    const byCopy = await readFeed(database.binding(), { query: "Street Fighter" });
    expect(byCopy.items.map(({ id }) => id)).toContain("feed-tai-sf6");

    const byWork = await readFeed(database.binding(), { query: "感谢对战" });
    expect(byWork.items.map(({ id }) => id)).toContain("feed-tai-sf6");

    const byAccount = await readFeed(database.binding(), { query: "@taiari_anime" });
    expect(byAccount.items.map(({ id }) => id)).toContain("feed-tai-sf6");
  });

  test("combines work and content filters and returns the work cover", async () => {
    const result = await readFeed(database.binding(), {
      animeSlug: "taiari",
      contentClasses: ["official_news"],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "feed-tai-sf6",
      animeSlug: "taiari",
      animeCoverUrl: expect.any(String),
    });
  });

  test("returns feed and media timestamps as explicit UTC instants", async () => {
    database.sqlite
      .query(
        `
      UPDATE feed_items SET published_at = '2026-08-14 06:48:00' WHERE id = 'feed-tai-sf6'
    `,
      )
      .run();
    database.sqlite
      .query(
        `
      UPDATE media_items SET published_at = '2026-08-14 06:47:00'
      WHERE id = 'media-kimi-official-key'
    `,
      )
      .run();

    const item = (await readFeed(database.binding(), { query: "Street Fighter" })).items[0];
    expect(item.publishedAt).toBe("2026-08-14T06:48:00.000Z");
    const media = (await readMedia(database.binding(), "anime-kimishinu")).find(
      ({ id }) => id === "media-kimi-official-key",
    );
    expect(media?.publishedAt).toBe("2026-08-14T06:47:00.000Z");
  });

  test("paginates with a stable cursor and no duplicate items", async () => {
    const all = await readFeed(database.binding(), { limit: 80 });
    const first = await readFeed(database.binding(), { limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await readFeed(database.binding(), { limit: 2, cursor: first.nextCursor! });
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(
      first.items.length + second.items.length,
    );
    expect([...first.items, ...second.items].map((item) => item.id)).toEqual(
      all.items.slice(0, 4).map((item) => item.id),
    );
  });

  test("rejects malformed feed cursors", async () => {
    await expect(readFeed(database.binding(), { cursor: "not-a-cursor" })).rejects.toMatchObject({
      status: 400,
    });
  });

  test("keeps feed query count constant across page sizes", async () => {
    database.resetMetrics();
    await readFeed(database.binding(), { limit: 1 });
    const singleItemQueries = database.preparedStatements;

    database.resetMetrics();
    await readFeed(database.binding(), { limit: 80 });

    expect(database.preparedStatements).toBe(singleItemQueries);
    expect(singleItemQueries).toBe(1);
  });
});
