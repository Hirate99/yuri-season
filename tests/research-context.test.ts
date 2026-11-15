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
  expect(queries).not.toContain('"search_memory_hits"');
  expect(database.executedStatements).toBeLessThanOrEqual(10);
});

test("bad source identifiers fail before any database reads", async () => {
  database.resetMetrics();
  await expect(readResearchContext(database.binding(), "routine", ["invalid"])).rejects.toThrow(
    "无效",
  );
  expect(database.executedStatements).toBe(0);
});

test("routine retains old source cursors beyond 300 unrelated searches and batches many accounts", async () => {
  for (let i = 0; i < 31; i++) {
    database.sqlite
      .query(
        `INSERT INTO accounts(id, owner_type, owner_id, platform, url, verified)
      VALUES (?, 'anime', 'anime-kimishinu', 'X', ?, 1)`,
      )
      .run(`account-budget-${i}`, `https://x.com/budget${i}`);
    database.sqlite
      .query(
        `INSERT INTO search_memory(id, scope_type, scope_id, search_kind,
      target_key, query_text, cursor_json, last_searched_at)
      VALUES (?, 'anime', 'anime-kimishinu', 'social', ?, 'source', '{"committedPostId":"100"}', '2026-01-01')`,
      )
      .run(`memory-budget-${i}`, `updates:anime-kimishinu:account-budget-${i}`);
  }
  for (let i = 0; i < 301; i++)
    database.sqlite
      .query(
        `INSERT INTO search_memory(id, scope_type, scope_id, search_kind,
      target_key, query_text, last_searched_at) VALUES (?, 'global', 'all', 'catalog', ?, 'unrelated', '2026-11-15')`,
      )
      .run(`unrelated-${i}`, `search-${i}`);
  const result = await readResearchContext(database.binding(), "routine");
  expect(result.memory.filter((record) => record.id.startsWith("memory-budget-"))).toHaveLength(31);
  expect(result.memory.every((record) => record.cursor?.committedPostId === "100")).toBe(true);
  expect(result.recentSearches).toHaveLength(30);
});

test("discovery reads scoped state without lifetime hit aggregation or a global 300-row window", async () => {
  for (let i = 0; i < 310; i++) {
    database.sqlite
      .query(
        `INSERT INTO search_memory(id, scope_type, scope_id, search_kind, target_key, query_text)
      VALUES (?, 'anime', 'anime-kimishinu', 'social', ?, 'current work')`,
      )
      .run(`scoped-${i}`, `query-${i}`);
  }
  database.exec(`INSERT INTO search_memory(id, scope_type, scope_id, search_kind, target_key, query_text)
    VALUES ('unrelated', 'anime', 'old-work', 'social', 'old', 'unrelated work')`);
  database.resetMetrics();
  const result = await readResearchContext(database.binding(), "discovery");
  expect(result.memory.filter((row) => row.id.startsWith("scoped-"))).toHaveLength(310);
  expect(result.memory.some((row) => row.id === "unrelated")).toBe(false);
  const memoryQueries = database.statements.filter((statement) =>
    statement.includes('from "search_memory"'),
  );
  expect(memoryQueries.length).toBeGreaterThan(0);
  for (const query of memoryQueries) {
    expect(query.toLowerCase()).not.toContain("join");
    expect(query.toLowerCase()).not.toContain("group by");
  }
});
