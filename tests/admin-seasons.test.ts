import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseSeasonWrite } from "~/http/input/season-input";
import { readSeasons } from "~/repositories/catalog";
import { createSeason, updateSeason } from "~/repositories/seasons/write";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("Admin seasons", () => {
  test("creates the next season and atomically switches the current catalog", async () => {
    const value = parseSeasonWrite({
      slug: "2026-autumn",
      label: "2026 秋",
      startsOn: "2026-10-01",
      endsOn: "2026-12-31",
      isCurrent: true,
    });
    const id = await createSeason(database.binding(), value);
    let seasons = await readSeasons(database.binding());
    expect(seasons.currentSlug).toBe("2026-autumn");
    expect(seasons.seasons.find((season) => season.slug === "2026-summer")?.isCurrent).toBe(false);

    await updateSeason(database.binding(), id, { ...value, label: "2026 秋季" });
    seasons = await readSeasons(database.binding());
    expect(seasons.seasons.find((season) => season.id === id)?.label).toBe("2026 秋季");
    expect(database.sqlite.query(`
      SELECT action FROM audit_log WHERE entity_id = ? ORDER BY created_at
    `).all(id)).toEqual([{ action: "create_season" }, { action: "update_season" }]);
  });

  test("does not allow removing the only current season", async () => {
    await expect(updateSeason(database.binding(), "season-2026-summer", {
      slug: "2026-summer",
      label: "2026 夏",
      startsOn: "2026-07-01",
      endsOn: "2026-09-30",
      isCurrent: false,
    })).rejects.toThrow("先把另一个季度设为当季");
  });
});
