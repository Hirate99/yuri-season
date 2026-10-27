import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { TestD1 } from "./support/d1-adapter";
import { readFeed } from "~/repositories/feed";
import { readAdminCoverage } from "~/repositories/admin/coverage";

type QueryPlanRow = { detail: string };

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

function plan(sql: string, ...bindings: Array<string | number>): string {
  return (database.sqlite.query(`EXPLAIN QUERY PLAN ${sql}`).all(...bindings) as QueryPlanRow[])
    .map((row) => row.detail)
    .join("\n");
}

describe("backend query plans", () => {
  test("media coverage probes publication links by index instead of scanning per media item", async () => {
    database.resetMetrics();
    await readAdminCoverage(database.binding());
    const statement = database.statements.find(
      (sql) => sql.includes('from "media_items"') && sql.includes('group by "media_items"'),
    );
    expect(statement).toBeDefined();
    const actual = plan(statement!);
    expect(actual).toContain("SEARCH feed_candidates USING COVERING INDEX idx_candidates_media");
    expect(actual).toContain("SEARCH feed_items USING COVERING INDEX idx_feed_items_media_public");
    expect(actual).not.toContain("SCAN feed_candidates");
    expect(actual).not.toContain("SCAN feed_items");
  });

  test("checks the actual public and cross-work feed statements", async () => {
    database.resetMetrics();
    await readFeed(database.binding(), { limit: 20 });
    expect(plan(database.statements[0], 21)).toContain("idx_feed_items_public_page");

    database.resetMetrics();
    await readFeed(database.binding(), { animeId: "anime-kimishinu", limit: 20 });
    const actual = plan(database.statements[0], "anime-kimishinu", "anime-kimishinu", 21);
    // The cross-work OR currently traverses the global feed ordering index.
    // Do not substitute a simplified anime_id-only query for this plan.
    expect(actual).toContain("idx_feed_items_public_page");
    expect(actual).toContain("discussion_id=? AND anime_id=?");
    expect(actual).toContain("idx_media_assets_ordered_public");
    expect(database.preparedStatements).toBe(1);
  });
});
