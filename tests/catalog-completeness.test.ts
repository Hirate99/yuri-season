import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readCatalog, readCatalogForSeason, readCurrentAnimeOptions, readSeasons } from "~/repositories/catalog";
import { readAnimePage, readAnimeRelated, readHomePage } from "~/application/public/service";
import { eventOccursToday } from "@/lib/calendar-events";
import { readAnimeDetail } from "~/repositories/detail";
import { readAdminDashboard } from "~/application/admin/service";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  const migrationPaths = Array.fromAsync(new Bun.Glob("migrations/*.sql").scan("."));
  for (const path of (await migrationPaths).sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("current-season catalog", () => {
  test("filters home events in the viewer timezone while retaining calendar data", async () => {
    const full = await readCatalog(database.binding());
    const now = new Date("2026-08-14T02:00:00Z");
    for (const timeZone of ["Asia/Tokyo", "America/Los_Angeles"]) {
      const home = await readCatalog(database.binding(), { events: "today", timeZone, now });
      expect(home.anime).toEqual(full.anime);
      expect(home.events).toEqual(full.events.filter((event) => eventOccursToday(event, timeZone, now)));
      expect(home.generatedAt).toBe(now.toISOString());
    }
  });

  test("keeps the current event calendar available to the homepage", async () => {
    const full = await readCatalog(database.binding());
    const home = await readHomePage(database.binding(), "Asia/Tokyo");
    expect(home.catalog.events).toEqual(full.events);
  });

  test("does not read discarded events or feed for an archived home", async () => {
    database.resetMetrics();
    const page = await readHomePage(database.binding(), "Asia/Tokyo", "2026-summer");
    expect(page.catalog.anime).toHaveLength(11);
    expect(page.catalog.events).toEqual([]);
    expect(page.feed).toBeNull();
    expect(database.preparedStatements).toBe(2);
  });

  test("keeps below-fold anime content out of the blocking page response", async () => {
    const page = await readAnimePage(database.binding(), "kimishinu");
    const related = await readAnimeRelated(database.binding(), "kimishinu");

    expect(Object.keys(page ?? {})).toEqual(["anime"]);
    expect(page?.anime.slug).toBe("kimishinu");
    expect(related?.feed.length).toBeGreaterThan(0);
    expect(related?.media.length).toBeGreaterThan(0);
  });

  test("returns only the fields needed by the Feed work selector", async () => {
    const options = await readCurrentAnimeOptions(database.binding());

    expect(options).toHaveLength(11);
    expect(options[0]).toEqual({
      id: expect.any(String),
      slug: expect.any(String),
      titleZh: expect.any(String),
      titleJa: expect.any(String),
      titleEn: expect.any(String),
    });
    expect(Object.keys(options[0]).sort()).toEqual(["id", "slug", "titleEn", "titleJa", "titleZh"]);
  });

  test("keeps the verified catalog expansion complete and classified", async () => {
    const catalog = await readCatalog(database.binding());
    expect(catalog.anime).toHaveLength(11);
    expect(catalog.anime.some((anime) => anime.slug === "plannosaurus")).toBe(false);
    expect(catalog.anime.filter((anime) => anime.yuriStatus === "pending").map((anime) => anime.slug).sort())
      .toEqual(["bang-dream-yumemita", "futsutsuka-akujo", "goodbye-lara", "grow-up-show"]);

    const yumemita = catalog.anime.find((anime) => anime.slug === "bang-dream-yumemita");
    const korekaite = catalog.anime.find((anime) => anime.slug === "kore-kaite-shine");
    expect(yumemita).toMatchObject({ yuriKind: "strong", yuriStatus: "pending", coverUrl: expect.any(String) });
    expect(korekaite).toMatchObject({
      yuriKind: "adjacent",
      yuriStatus: "confirmed",
      coverUrl: expect.any(String),
      currentEpisode: 6,
    });
    expect(Object.keys(korekaite ?? {}).sort()).toEqual([
      "coverUrl",
      "currentEpisode",
      "id",
      "primarySlot",
      "slug",
      "titleJa",
      "titleZh",
      "yuriKind",
      "yuriStatus",
    ]);
  });

  test("keeps stable season archives when the current season changes", async () => {
    database.exec(`
      UPDATE seasons SET is_current = 0;
      INSERT INTO seasons (id, slug, label, starts_on, ends_on, is_current)
      VALUES ('season-2026-autumn', '2026-autumn', '2026 秋', '2026-10-01', '2026-12-31', 1);
    `);

    const index = await readSeasons(database.binding());
    const summer = await readCatalogForSeason(database.binding(), "2026-summer");
    expect(index.currentSlug).toBe("2026-autumn");
    expect(index.seasons.map((season) => season.slug)).toEqual(["2026-autumn", "2026-summer"]);
    expect(index.seasons.find((season) => season.slug === "2026-summer")?.animeCount).toBe(11);
    expect(summer.anime).toHaveLength(11);
  });

  test("loads staff, cast, accounts and Japanese broadcast times on new detail pages", async () => {
    const yumemita = await readAnimeDetail(database.binding(), "bang-dream-yumemita");
    const korekaite = await readAnimeDetail(database.binding(), "kore-kaite-shine");

    expect(yumemita).toMatchObject({
      broadcasts: [expect.objectContaining({ localTime: "23:00" })],
      accounts: [expect.objectContaining({ handle: "@bang_dream_info" })],
    });
    expect(yumemita?.staff).toHaveLength(6);
    expect(yumemita?.cast).toHaveLength(5);
    expect(yumemita?.cast.map((credit) => credit.characterNameNative))
      .toEqual(["仲町あられ", "宮永ののか", "峰月律", "藤都子", "千石ユノ"]);

    expect(korekaite).toMatchObject({
      broadcasts: [expect.objectContaining({ localTime: "23:30" })],
      accounts: [expect.objectContaining({ handle: "@korekaite_shine" })],
    });
    expect(korekaite?.staff).toHaveLength(5);
    expect(korekaite?.cast).toHaveLength(5);
  });

  test("stores the five verified YUME∞MITA birthdays with corrected display names", async () => {
    const detail = await readAnimeDetail(database.binding(), "bang-dream-yumemita");
    expect(detail?.cast.map((credit) => [
      credit.characterName,
      credit.birthdayMonth,
      credit.birthdayDay,
      credit.birthdayVerified,
    ])).toEqual([
      ["仲町阿拉蕾", 8, 16, true],
      ["宫永野乃花", 4, 17, true],
      ["峰月律", 2, 7, true],
      ["藤都子", 9, 19, true],
      ["千石由乃", 11, 4, true],
    ]);
    expect(detail?.events.filter((event) => event.eventType === "birthday")).toHaveLength(5);
    expect(detail?.events.filter((event) => event.eventType === "birthday")
      .every((event) => Boolean(event.characterPortraitUrl && event.characterPortraitSourceUrl)))
      .toBe(true);
  });

  test("exposes registered source provenance without duplicating source URLs", async () => {
    database.exec(`
      UPDATE research_sources
      SET last_checked_at = '2026-08-11T20:00:00Z'
      WHERE anime_id = 'anime-kimishinu';
      INSERT INTO research_sources (
        id, anime_id, source_type, label, url, trust_level,
        poll_interval_min, cadence_profile, change_kind
      ) VALUES (
        'source-kimishinu-duplicate', 'anime-kimishinu', 'official_page',
        '重复来源', 'https://kimishinu-anime.com/news/', 'official',
        1440, 'local', 'feed_candidate'
      );
    `);

    const detail = await readAnimeDetail(database.binding(), "kimishinu");
    const sourceUrls = detail?.sources.map((source) => source.url) ?? [];
    expect(detail?.sources.length).toBeGreaterThan(0);
    expect(new Set(sourceUrls).size).toBe(sourceUrls.length);
    expect(detail?.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
    expect(detail?.lastCheckedAt).toBe("2026-08-11T20:00:00Z");
  });

  test("reports per-work content gaps for the Admin coverage view", async () => {
    const dashboard = await readAdminDashboard(database.binding());
    const kimishinu = dashboard.coverage.find((item) => item.animeId === "anime-kimishinu");
    const azurLane = dashboard.coverage.find((item) => item.animeId === "anime-azurlane-bisoku-2");

    expect(dashboard.coverage).toHaveLength(11);
    expect(kimishinu).toMatchObject({
      hasCover: true,
      broadcasts: 1,
      themeSongs: 0,
      themeSongCovers: 0,
      mainCharacters: 4,
      mainCharacterExpected: 4,
      sourcedMainCharacters: 4,
      namedMainCharacters: 4,
      auditedMainBirthdays: 0,
      verifiedMainBirthdays: 0,
    });
    expect(kimishinu?.staff).toBeGreaterThan(0);
    expect(kimishinu?.cast).toBeGreaterThan(0);
    expect(kimishinu?.verifiedAccounts).toBeGreaterThan(0);
    expect(kimishinu?.sources).toBeGreaterThan(0);
    expect(azurLane?.discussions).toBe(0);
  });

  test("loads in-scope discovered works without inventing unverified birthdays", async () => {
    const futsutsuka = await readAnimeDetail(database.binding(), "futsutsuka-akujo");
    const magilumiere = await readAnimeDetail(database.binding(), "magilumiere-2");
    const dodge = await readAnimeDetail(database.binding(), "dodge-danko");

    expect(futsutsuka).toMatchObject({
      yuriKind: "strong",
      yuriStatus: "pending",
      broadcasts: [expect.objectContaining({ localTime: "23:45" })],
      accounts: [expect.objectContaining({ handle: "@futsutsuka_PR" })],
    });
    expect(futsutsuka?.staff).toHaveLength(6);
    expect(futsutsuka?.cast).toHaveLength(2);
    expect(futsutsuka?.cast.filter((credit) => credit.birthdayVerified).map((credit) => credit.characterName))
      .toEqual(["黄玲琳", "朱慧月"]);

    expect(magilumiere).toMatchObject({
      yuriKind: "adjacent",
      yuriStatus: "confirmed",
      broadcasts: [expect.objectContaining({ localTime: "24:55" })],
      accounts: [expect.objectContaining({ handle: "@MagilumiereLtd" })],
    });
    expect(magilumiere?.staff).toHaveLength(6);
    expect(magilumiere?.cast).toHaveLength(5);
    expect(magilumiere?.cast.every((credit) => !credit.birthdayVerified)).toBe(true);

    expect(dodge?.staff).toHaveLength(6);
    expect(dodge?.cast).toHaveLength(7);
    expect(dodge?.cast.slice(-2).map((credit) => credit.characterNameNative))
      .toEqual(["三笠はこ", "火浦颯美"]);
    expect(dodge?.cast.every((credit) => !credit.birthdayVerified)).toBe(true);

    const adminCharacterRows = database.sqlite.query(`
      SELECT c.name_native, c.is_main_group
      FROM characters c
      WHERE c.anime_id = 'anime-futsutsuka'
      ORDER BY c.sort_order
    `).all() as Array<{ name_native: string; is_main_group: number }>;
    expect(adminCharacterRows).toHaveLength(5);
    expect(adminCharacterRows.filter((row) => row.is_main_group === 0)).toHaveLength(3);

    expect(await readAnimeDetail(database.binding(), "plannosaurus")).toBeNull();
  });

  test("exposes only first-party verified person accounts added by the evidence migration", async () => {
    const growUp = await readAnimeDetail(database.binding(), "grow-up-show");
    const korekaite = await readAnimeDetail(database.binding(), "kore-kaite-shine");

    expect(growUp?.cast.find((credit) => credit.personId === "person-kusunoki-tomori")?.accounts)
      .toContainEqual(expect.objectContaining({ handle: "@tomori_kusunoki", verified: true }));
    expect(growUp?.cast.find((credit) => credit.personId === "person-natsuyoshi-yuko")?.accounts)
      .toContainEqual(expect.objectContaining({ handle: "@__yuuuumr__", verified: true }));
    expect(korekaite?.cast.find((credit) => credit.personId === "person-minase-inori")?.accounts)
      .toContainEqual(expect.objectContaining({ handle: "@inoriminase", verified: true }));

    const evidence = database.sqlite.query(`
      SELECT id, verification_source_url FROM accounts
      WHERE id IN (
        'account-kusunoki-tomori-x',
        'account-natsuyoshi-yuko-x',
        'account-minase-inori-x'
      )
      ORDER BY id
    `).all();
    expect(evidence).toEqual([
      { id: "account-kusunoki-tomori-x", verification_source_url: "https://cocotame.jp/series/014675/" },
      { id: "account-minase-inori-x", verification_source_url: "https://www.inoriminase.com/news/?id=1739" },
      { id: "account-natsuyoshi-yuko-x", verification_source_url: "https://bushiroad.com/media/8497" },
    ]);
  });
});
