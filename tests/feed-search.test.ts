import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFeed } from "../worker/repositories/feed";
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

  test("paginates with a stable cursor and no duplicate items", async () => {
    const all = await readFeed(database.binding(), { limit: 80 });
    const first = await readFeed(database.binding(), { limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await readFeed(database.binding(), { limit: 2, cursor: first.nextCursor! });
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size)
      .toBe(first.items.length + second.items.length);
    expect([...first.items, ...second.items].map((item) => item.id))
      .toEqual(all.items.slice(0, 4).map((item) => item.id));
  });

  test("rejects malformed feed cursors", async () => {
    await expect(readFeed(database.binding(), { cursor: "not-a-cursor" })).rejects.toMatchObject({ status: 400 });
  });
});
