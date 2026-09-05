import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readAnimeDetail } from "~/repositories/detail";
import { readCalendar, readCatalog } from "~/repositories/catalog";
import { readAdminAnimeResources } from "~/repositories/admin/resources";
import { personBelongsToAnime } from "~/repositories/admin/resource-context";
import { readAnimeSummaryBySlug } from "~/infrastructure/db/read-models/anime";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;
beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});
afterEach(() => database.close());

describe("D1 read budgets", () => {
  test("keeps feed aggregates correct with multiple slots, withdrawn items and no visible items", async () => {
    const animeId = "anime-kimishinu";
    const expected = database.sqlite.query(`SELECT COUNT(id) AS feedCount, MAX(published_at) AS latestFeedAt
      FROM feed_items WHERE anime_id = ? AND withdrawn_at IS NULL`).get(animeId) as { feedCount: number; latestFeedAt: string };
    expect(expected.feedCount).toBeGreaterThan(0);
    database.sqlite.query("UPDATE broadcast_slots SET is_primary = 1 WHERE anime_id = ?").run(animeId);
    expect(await readAnimeSummaryBySlug(database.binding(), "kimishinu")).toMatchObject(expected);
    database.sqlite.query("UPDATE feed_items SET withdrawn_at = CURRENT_TIMESTAMP WHERE anime_id = ?").run(animeId);
    expect(await readAnimeSummaryBySlug(database.binding(), "kimishinu"))
      .toMatchObject({ id: animeId, feedCount: 0, latestFeedAt: null });
    database.sqlite.query("UPDATE feed_items SET anime_id = NULL WHERE anime_id = ?").run(animeId);
    expect(await readAnimeSummaryBySlug(database.binding(), "kimishinu"))
      .toMatchObject({ id: animeId, feedCount: 0, latestFeedAt: null });
  });

  test("shares credit fields while preserving public filtering and admin-only fields", async () => {
    const detail = (await readAnimeDetail(database.binding(), "kimishinu"))!;
    const admin = await readAdminAnimeResources(database.binding(), detail.id);
    for (const { accounts, ...credit } of detail.cast) {
      expect(admin.cast.find(({ id }) => id === credit.id)).toMatchObject(credit);
      expect(credit).not.toHaveProperty("isMainGroup");
      expect(credit).not.toHaveProperty("birthdaySourceUrl");
    }
    for (const { accounts, ...credit } of detail.staff) {
      expect(admin.staff.find(({ id }) => id === credit.id)).toMatchObject(credit);
      expect(credit).not.toHaveProperty("primaryKind");
    }
    database.exec("UPDATE characters SET is_main_group = 0 WHERE id = 'char-sheena'");
    expect((await readAnimeDetail(database.binding(), "kimishinu"))!.cast.some(({ characterId }) => characterId === "char-sheena")).toBe(false);
    expect((await readAdminAnimeResources(database.binding(), detail.id)).cast)
      .toContainEqual(expect.objectContaining({ characterId: "char-sheena", isMainGroup: false }));
  });

  test("batches detail reads without losing joined names or account ownership", async () => {
    const detail = await readAnimeDetail(database.binding(), "kimishinu");
    expect(database.calls).toBe(2);
    expect(database.executedStatements).toBe(8);
    expect(detail?.cast.find(credit => credit.characterId === "char-sheena")).toMatchObject({
      characterName: "席娜", characterNameNative: "トツキ・シーナ",
      personName: "高桥李依", personNameNative: "高橋 李依",
      accounts: expect.arrayContaining([expect.objectContaining({ handle: "@taka8rie" })]),
    });
    expect(detail?.accounts.every(account => account.handle !== "@taka8rie")).toBe(true);
  });

  test("keeps missing details to one lookup", async () => {
    expect(await readAnimeDetail(database.binding(), "missing-work")).toBeNull();
    expect(database.calls).toBe(1);
    expect(database.executedStatements).toBe(1);
  });

  test("keeps catalog and calendar identifiers intact across batch mapping", async () => {
    const catalog = await readCatalog(database.binding());
    expect(database.calls).toBe(2);
    expect(database.executedStatements).toBe(3);
    const work = catalog.anime.find(anime => anime.slug === "kimishinu")!;
    expect(work.id).toBe("anime-kimishinu");
    expect(work.primarySlot?.id).not.toBe(work.id);

    database.resetMetrics();
    const calendar = await readCalendar(database.binding());
    expect(database.calls).toBe(2);
    expect(database.executedStatements).toBe(3);
    expect(calendar.entries).toContainEqual(expect.objectContaining({
      animeId: work.id, animeSlug: work.slug,
      slot: expect.objectContaining({ id: work.primarySlot!.id }),
    }));
  });

  test("batches admin resource sections and preserves character/person columns", async () => {
    const resources = await readAdminAnimeResources(database.binding(), "anime-kimishinu");
    expect(database.calls).toBe(4);
    expect(database.executedStatements).toBe(11);
    expect(resources.cast.find(credit => credit.characterId === "char-sheena")).toMatchObject({
      characterName: "席娜", personName: "高桥李依",
    });
    expect(resources.discussions).toContainEqual(expect.objectContaining({
      animeIds: expect.arrayContaining(["anime-kimishinu"]),
    }));
  });

  test("checks staff, cast and unrelated people with one bounded query", async () => {
    const staff = database.sqlite.query("SELECT person_id FROM work_credits WHERE anime_id = ? LIMIT 1")
      .get("anime-kimishinu") as { person_id: string };
    for (const [personId, expected] of [[staff.person_id, true], ["person-takahashi-rie", true], ["missing-person", false]] as const) {
      database.resetMetrics();
      expect(await personBelongsToAnime(database.binding(), "anime-kimishinu", personId)).toBe(expected);
      expect(database.calls).toBe(1);
      expect(database.executedStatements).toBe(1);
    }
  });
});
