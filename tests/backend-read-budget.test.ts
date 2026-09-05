import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readAnimeDetail } from "~/repositories/detail";
import { readCalendar, readCatalog } from "~/repositories/catalog";
import { readAdminAnimeResources } from "~/repositories/admin/resources";
import { personBelongsToAnime } from "~/repositories/admin/resource-context";
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
