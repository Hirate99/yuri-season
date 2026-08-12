import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseSourceChecks } from "../worker/api/source-check-input";
import { recordSourceChecks } from "../worker/repositories/source-checks";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("local source health recording", () => {
  test("records successful checks and replays the same result idempotently", async () => {
    const checks = parseSourceChecks({ checks: [{
      sourceId: "source-kimi-news", checkedAt: "2026-08-11T20:00:00Z",
      outcome: "success", etag: "v2", lastModified: null,
    }] });
    expect(await recordSourceChecks(database.binding(), checks)).toEqual({ received: 1, updated: 1 });
    expect(await recordSourceChecks(database.binding(), checks)).toEqual({ received: 1, updated: 0 });
    expect(database.sqlite.query(`
      SELECT last_checked_at, etag, failure_count, last_error
      FROM research_sources WHERE id = 'source-kimi-news'
    `).get()).toEqual({ last_checked_at: "2026-08-11T20:00:00.000Z", etag: "v2", failure_count: 0, last_error: null });
  });

  test("records a newer failure once without double-counting a replay", async () => {
    const checks = parseSourceChecks({ checks: [{
      sourceId: "source-kimi-news", checkedAt: "2026-08-12T20:00:00Z",
      outcome: "failure", error: "source returned 503",
    }] });
    await recordSourceChecks(database.binding(), checks);
    await recordSourceChecks(database.binding(), checks);
    expect(database.sqlite.query(`
      SELECT failure_count, last_error FROM research_sources WHERE id = 'source-kimi-news'
    `).get()).toEqual({ failure_count: 1, last_error: "source returned 503" });
  });

  test("rejects duplicate sources and failures without an error", () => {
    const base = { sourceId: "source-kimi-news", checkedAt: "2026-08-11T20:00:00Z", outcome: "success" };
    expect(() => parseSourceChecks({ checks: [base, base] })).toThrow("重复 sourceId");
    expect(() => parseSourceChecks({ checks: [{ ...base, outcome: "failure" }] })).toThrow("需要 error");
  });
});
