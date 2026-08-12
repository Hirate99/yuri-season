import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { TestD1 } from "./support/d1-adapter";

type QueryPlanRow = { detail: string };

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

function plan(sql: string, ...bindings: string[]): string {
  return (database.sqlite.query(`EXPLAIN QUERY PLAN ${sql}`).all(...bindings) as QueryPlanRow[])
    .map((row) => row.detail)
    .join("\n");
}

describe("backend query plans", () => {
  test("uses the work/primary-slot index for catalog joins", () => {
    expect(plan(`
      SELECT id FROM broadcast_slots
      WHERE anime_id = ? AND is_primary = 1
      ORDER BY weekday, local_time
    `, "anime-kimishinu")).toContain("idx_broadcast_anime_primary");
  });

  test("uses the work/event and work/source indexes on detail pages", () => {
    expect(plan(`
      SELECT id FROM events
      WHERE anime_id = ? AND verified = 1
      ORDER BY starts_at, title
    `, "anime-kimishinu")).toContain("idx_events_anime_verified");

    expect(plan(`
      SELECT id FROM research_sources
      WHERE anime_id = ? AND enabled = 1
    `, "anime-kimishinu")).toContain("idx_sources_anime_enabled");
  });

  test("uses stable feed pagination indexes for public and work feeds", () => {
    expect(plan(`
      SELECT id FROM feed_items
      WHERE withdrawn_at IS NULL
      ORDER BY is_pinned DESC, published_at DESC, id DESC
      LIMIT 41
    `)).toContain("idx_feed_items_public_page");

    expect(plan(`
      SELECT id FROM feed_items
      WHERE anime_id = ? AND withdrawn_at IS NULL
      ORDER BY is_pinned DESC, published_at DESC, id DESC
      LIMIT 41
    `, "anime-kimishinu")).toContain("idx_feed_items_anime_page");
  });
});
