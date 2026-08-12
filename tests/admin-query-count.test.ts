import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readAdminDashboard } from "../worker/repositories/admin";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("Admin dashboard query budget", () => {
  test("does not add one catalog query per season", async () => {
    database.resetMetrics();
    await readAdminDashboard(database.binding());
    const oneSeasonQueries = database.preparedStatements;

    database.exec(`
      INSERT INTO seasons (id, slug, label, starts_on, ends_on, is_current)
      VALUES ('season-next', 'next', 'Next', '2026-10-01', '2026-12-31', 0)
    `);
    database.resetMetrics();
    await readAdminDashboard(database.binding());

    expect(database.preparedStatements).toBe(oneSeasonQueries);
  });
});
