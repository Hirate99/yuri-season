import { afterEach, beforeEach, expect, test } from "bun:test";
import { readResearchContext } from "~/application/research/context";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;
beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort())
    database.exec(await Bun.file(path).text());
  database.exec("UPDATE seasons SET starts_on = '2000-01-01', ends_on = '2099-12-31'");
});
afterEach(() => database.close());

test("saving one source does not read the dashboard, unrelated works, or hit history", async () => {
  database.resetMetrics();
  const result = await readResearchContext(database.binding(), "routine", [
    "anime:anime-kimishinu:social:updates:anime-kimishinu:account-test",
  ]);
  expect(result.dashboard.anime.map((work) => work.id)).toEqual(["anime-kimishinu"]);
  expect(Object.keys(result.resources)).toEqual(["anime-kimishinu"]);
  expect(result.memoryHits).toEqual([]);
  const queries = database.statements.join("\n");
  for (const table of [
    "audit_log",
    "research_runs",
    "update_jobs",
    "media_items",
    "feed_candidates",
  ])
    expect(queries).not.toContain(`from "${table}"`);
  expect(queries).not.toContain('from "search_memory_hits"');
  expect(database.executedStatements).toBeLessThanOrEqual(10);
});

test("bad source identifiers fail before any database reads", async () => {
  database.resetMetrics();
  await expect(readResearchContext(database.binding(), "routine", ["invalid"])).rejects.toThrow(
    "无效",
  );
  expect(database.executedStatements).toBe(0);
});
