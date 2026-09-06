import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readAdminDashboard } from "~/application/admin/service";
import { readAdminCoverage } from "~/repositories/admin/coverage";
import { readAdminAnimeResources } from "~/repositories/admin/resources";
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
    const oneSeasonQueries = database.executedStatements;

    database.exec(`
      INSERT INTO seasons (id, slug, label, starts_on, ends_on, is_current)
      VALUES ('season-next', 'next', 'Next', '2026-10-01', '2026-12-31', 0)
    `);
    database.resetMetrics();
    await readAdminDashboard(database.binding());

    expect(database.executedStatements).toBe(oneSeasonQueries);
  });

  test("keeps admin reads bounded as works and resources grow", async () => {
    database.resetMetrics();
    await readAdminCoverage(database.binding());
    const baseline = database.executedStatements;

    database.exec(`
      INSERT INTO anime (
        id, season_id, slug, title_zh, title_ja, synopsis, yuri_kind,
        status, premiere_at, visual_theme, featured
      ) VALUES (
        'anime-query-budget', 'season-2026-summer', 'query-budget',
        'Query Budget', 'Query Budget', '', 'adjacent',
        'upcoming', '2026-09-01T00:00:00Z', 'lime', 0
      )
    `);
    database.resetMetrics();
    await readAdminCoverage(database.binding());

    expect(database.executedStatements).toBe(baseline);
    expect(baseline).toBeLessThanOrEqual(20);

    for (let index = 0; index < 101; index += 1) {
      const id = `budget-${index}`;
      database.sqlite
        .query("INSERT INTO people (id, name, primary_kind) VALUES (?, ?, 'staff')")
        .run(id, id);
      database.sqlite
        .query(
          "INSERT INTO work_credits (id, anime_id, person_id, role) VALUES (?, 'anime-query-budget', ?, 'Staff')",
        )
        .run(id, id);
      database.sqlite
        .query(
          "INSERT INTO discussions (id, anime_id, platform, title, url) VALUES (?, 'anime-query-budget', 'Forum', ?, ?)",
        )
        .run(id, id, `https://example.test/${id}`);
      database.sqlite
        .query(
          "INSERT INTO discussion_anime (discussion_id, anime_id) VALUES (?, 'anime-query-budget')",
        )
        .run(id);
      database.sqlite
        .query("INSERT INTO music_tracks (id, title, artist) VALUES (?, ?, 'Artist')")
        .run(id, id);
      database.sqlite
        .query(
          "INSERT INTO anime_theme_songs (id, anime_id, track_id, song_kind, sequence) VALUES (?, 'anime-query-budget', ?, ?, ?)",
        )
        .run(id, id, index < 99 ? "opening" : "ending", (index % 99) + 1);
    }
    database.resetMetrics();
    const resources = await readAdminAnimeResources(database.binding(), "anime-query-budget");
    expect([
      resources.staff.length,
      resources.discussions.length,
      resources.themeSongs.length,
    ]).toEqual([101, 101, 101]);
    expect(database.calls).toBe(3);
  });
});
