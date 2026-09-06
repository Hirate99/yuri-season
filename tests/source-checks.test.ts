import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { sourceChecksSchema } from "~/http/input/source-check-input";
import { recordSourceChecks } from "~/repositories/source-checks";
import { markSourceFailure, markSourceSuccess, readSource } from "~/research/sources";
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
  test.each([false, true])(
    "shares success scheduling with Worker checks (urgent: %s)",
    async (urgent) => {
      database.sqlite
        .query(
          `UPDATE research_sources SET etag = 'old-tag', last_modified = 'old-date',
      failure_count = 3, last_error = 'failed', lease_until = '2999-01-01',
      poll_interval_min = 45, urgency_until = ? WHERE id = 'source-kimi-news'`,
        )
        .run(urgent ? "2999-01-01" : null);
      const source = await readSource(database.binding(), "source-kimi-news");
      await markSourceSuccess(database.binding(), source!, null, null);
      const health = () =>
        database.sqlite
          .query(
            `SELECT etag, last_modified, failure_count, last_error, lease_until,
      ROUND((julianday(next_check_at) - julianday(last_checked_at)) * 1440) AS delay
      FROM research_sources WHERE id = 'source-kimi-news'`,
          )
          .get();
      const expected = {
        etag: "old-tag",
        last_modified: "old-date",
        failure_count: 0,
        last_error: null,
        lease_until: null,
        delay: urgent ? 2 : 45,
      };
      expect(health()).toEqual(expected);
      expect(
        await recordSourceChecks(database.binding(), [
          {
            sourceId: source!.id,
            checkedAt: "2998-01-01T00:00:00.000Z",
            outcome: "success",
            etag: null,
            lastModified: null,
          },
        ]),
      ).toEqual({ received: 1, updated: 1 });
      expect(health()).toEqual(expected);
    },
  );

  test.each([0, 71, 100])("shares capped failure backoff after %s failures", async (failures) => {
    database.sqlite
      .query(
        "UPDATE research_sources SET failure_count = ?, lease_until = '2999-01-01' WHERE id = 'source-kimi-news'",
      )
      .run(failures);
    const error = "x".repeat(900);
    await markSourceFailure(database.binding(), "source-kimi-news", new Error(error));
    const health = () =>
      database.sqlite
        .query(
          `SELECT failure_count, last_error, lease_until,
      ROUND((julianday(next_check_at) - julianday(last_checked_at)) * 1440) AS delay
      FROM research_sources WHERE id = 'source-kimi-news'`,
        )
        .get();
    expect(health()).toEqual({
      failure_count: failures + 1,
      last_error: error.slice(0, 800),
      lease_until: null,
      delay: Math.min(360, (failures + 1) * 5),
    });
    const check = {
      sourceId: "source-kimi-news",
      checkedAt: "2998-01-01T00:00:00.000Z",
      outcome: "failure" as const,
      error: "local failure",
    };
    await recordSourceChecks(database.binding(), [check]);
    expect(health()).toEqual({
      failure_count: failures + 2,
      last_error: "local failure",
      lease_until: null,
      delay: Math.min(360, (failures + 2) * 5),
    });
    expect(await recordSourceChecks(database.binding(), [check])).toEqual({
      received: 1,
      updated: 0,
    });
  });

  test("ignores local results older than a Worker check and skips empty batches", async () => {
    await markSourceFailure(database.binding(), "source-kimi-news", "worker failure");
    const before = database.sqlite
      .query("SELECT * FROM research_sources WHERE id = 'source-kimi-news'")
      .get();
    expect(
      await recordSourceChecks(database.binding(), [
        {
          sourceId: "source-kimi-news",
          checkedAt: "2000-01-01T00:00:00.000Z",
          outcome: "success",
          etag: "stale",
        },
      ]),
    ).toEqual({ received: 1, updated: 0 });
    expect(
      database.sqlite.query("SELECT * FROM research_sources WHERE id = 'source-kimi-news'").get(),
    ).toEqual(before);
    database.resetMetrics();
    expect(await recordSourceChecks(database.binding(), [])).toEqual({ received: 0, updated: 0 });
    expect(database.calls).toBe(0);
  });

  test("records successful checks and replays the same result idempotently", async () => {
    const checks = sourceChecksSchema.parse({
      checks: [
        {
          sourceId: "source-kimi-news",
          checkedAt: "2026-08-11T20:00:00Z",
          outcome: "success",
          etag: "v2",
          lastModified: null,
        },
      ],
    });
    expect(await recordSourceChecks(database.binding(), checks)).toEqual({
      received: 1,
      updated: 1,
    });
    expect(await recordSourceChecks(database.binding(), checks)).toEqual({
      received: 1,
      updated: 0,
    });
    expect(
      database.sqlite
        .query(
          `
      SELECT last_checked_at, etag, failure_count, last_error
      FROM research_sources WHERE id = 'source-kimi-news'
    `,
        )
        .get(),
    ).toEqual({
      last_checked_at: "2026-08-11T20:00:00.000Z",
      etag: "v2",
      failure_count: 0,
      last_error: null,
    });
  });

  test("records a newer failure once without double-counting a replay", async () => {
    const checks = sourceChecksSchema.parse({
      checks: [
        {
          sourceId: "source-kimi-news",
          checkedAt: "2026-08-12T20:00:00Z",
          outcome: "failure",
          error: "source returned 503",
        },
      ],
    });
    await recordSourceChecks(database.binding(), checks);
    await recordSourceChecks(database.binding(), checks);
    expect(
      database.sqlite
        .query(
          `
      SELECT failure_count, last_error FROM research_sources WHERE id = 'source-kimi-news'
    `,
        )
        .get(),
    ).toEqual({ failure_count: 1, last_error: "source returned 503" });
  });

  test("rejects duplicate sources and failures without an error", () => {
    const base = {
      sourceId: "source-kimi-news",
      checkedAt: "2026-08-11T20:00:00Z",
      outcome: "success",
    };
    expect(() => sourceChecksSchema.parse({ checks: [base, base] })).toThrow("重复 sourceId");
    expect(() => sourceChecksSchema.parse({ checks: [{ ...base, outcome: "failure" }] })).toThrow(
      "需要 error",
    );
  });
});
