import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseResourceWrite } from "~/http/input/resource-input";
import { birthdayOccurrence } from "~/repositories/admin/birthday-events";
import {
  createAdminResource,
  deleteAdminResource,
  updateAdminResource,
} from "~/application/admin/resources";
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

describe("Admin anime resources", () => {
  test("creates, updates and removes Japanese broadcast slots with one primary slot", async () => {
    const animeId = "anime-kimishinu";
    const write = parseResourceWrite("broadcast", {
      label: "BS11",
      weekday: 3,
      localTime: "25:15",
      timezone: "Asia/Tokyo",
      platformUrl: "https://www.bs11.jp/",
      isPrimary: true,
    });
    const id = await createAdminResource(database.binding(), animeId, write);
    let resources = await readAdminAnimeResources(database.binding(), animeId);
    expect(resources.broadcasts.filter((slot) => slot.isPrimary)).toHaveLength(1);
    expect(resources.broadcasts.find((slot) => slot.id === id)?.localTime).toBe("25:15");

    const update = parseResourceWrite("broadcast", { ...write.value, localTime: "25:30" });
    await updateAdminResource(database.binding(), animeId, "broadcast", id, update);
    resources = await readAdminAnimeResources(database.binding(), animeId);
    expect(resources.broadcasts.find((slot) => slot.id === id)?.localTime).toBe("25:30");

    await deleteAdminResource(database.binding(), animeId, "broadcast", id);
    expect((await readAdminAnimeResources(database.binding(), animeId)).broadcasts.some((slot) => slot.id === id)).toBe(false);
    expect(database.sqlite.query(`
      SELECT action FROM audit_log WHERE entity_id = ? ORDER BY created_at
    `).all(id)).toEqual([
      { action: "create_resource" },
      { action: "update_resource" },
      { action: "delete_resource" },
    ]);
  });

  test("maintains staff, cast, verified accounts and low-frequency sources", async () => {
    const animeId = "anime-kimishinu";
    const staffId = await createAdminResource(database.binding(), animeId, parseResourceWrite("staff", {
      personId: null,
      name: "测试监督",
      nameNative: "テスト監督",
      primaryKind: "staff",
      role: "演出",
      profileUrl: null,
      sortOrder: 90,
    }));
    const castId = await createAdminResource(database.binding(), animeId, parseResourceWrite("cast", {
      personId: null,
      characterName: "测试角色",
      characterNameNative: "テストキャラ",
      characterProfile: null,
      personName: "测试声优",
      personNameNative: "テスト声優",
      birthdayMonth: 2,
      birthdayDay: 29,
      birthdayYear: null,
      birthdayTimezone: "Asia/Tokyo",
      birthdaySourceUrl: "https://example.com/character",
      birthdayVerified: true,
      sortOrder: 90,
    }));
    const accountId = await createAdminResource(database.binding(), animeId, parseResourceWrite("account", {
      ownerType: "anime",
      ownerId: animeId,
      platform: "YouTube",
      handle: "@verified-show",
      url: "https://www.youtube.com/@verified-show",
      verified: true,
      monitorMode: "local",
      verificationSourceUrl: "https://example.com/official",
    }));
    const sourceWrite = parseResourceWrite("source", {
      accountId,
      sourceType: "youtube",
      changeKind: "feed_candidate",
      label: "公式 YouTube",
      url: "https://www.youtube.com/@verified-show/videos",
      itemUrlTemplate: null,
      trustLevel: "official",
      pollIntervalMin: 1440,
      cadenceProfile: "local",
      enabled: true,
    });
    const sourceId = await createAdminResource(database.binding(), animeId, sourceWrite);

    let resources = await readAdminAnimeResources(database.binding(), animeId);
    expect(resources.staff.find((credit) => credit.id === staffId)?.name).toBe("测试监督");
    expect(resources.cast.find((credit) => credit.id === castId)).toMatchObject({ birthdayDay: 29, birthdayVerified: true });
    expect(database.sqlite.query(`
      SELECT event_type, starts_at, timezone, source_url, verified, recurrence_rule
      FROM events WHERE anime_id = ? AND character_id = (
        SELECT character_id FROM cast_credits WHERE id = ?
      )
    `).get(animeId, castId)).toEqual({
      event_type: "birthday",
      starts_at: "2028-02-29",
      timezone: "Asia/Tokyo",
      source_url: "https://example.com/character",
      verified: 1,
      recurrence_rule: "FREQ=YEARLY",
    });

    await updateAdminResource(database.binding(), animeId, "cast", castId, parseResourceWrite("cast", {
      personId: null,
      characterName: "测试角色",
      characterNameNative: "テストキャラ",
      characterProfile: null,
      personName: "测试声优",
      personNameNative: "テスト声優",
      birthdayMonth: null,
      birthdayDay: null,
      birthdayYear: null,
      birthdayTimezone: "Asia/Tokyo",
      birthdaySourceUrl: null,
      birthdayVerified: false,
      sortOrder: 90,
    }));
    expect(database.sqlite.query(`
      SELECT COUNT(*) AS count FROM events WHERE anime_id = ? AND character_id = (
        SELECT character_id FROM cast_credits WHERE id = ?
      ) AND event_type = 'birthday'
    `).get(animeId, castId)).toEqual({ count: 0 });
    expect(resources.accounts.find((account) => account.id === accountId)).toMatchObject({ verified: true, monitorMode: "local" });
    expect(resources.sources.find((source) => source.id === sourceId)).toMatchObject({
      pollIntervalMin: 1440,
      enabled: true,
      publicTextMode: "full_with_translation",
      maxPublicCharacters: 24000,
    });

    await updateAdminResource(database.binding(), animeId, "source", sourceId,
      parseResourceWrite("source", { ...sourceWrite.value, enabled: false }));
    resources = await readAdminAnimeResources(database.binding(), animeId);
    expect(resources.sources.find((source) => source.id === sourceId)?.enabled).toBe(false);

    await deleteAdminResource(database.binding(), animeId, "account", accountId);
    expect(database.sqlite.query("SELECT account_id FROM research_sources WHERE id = ?").get(sourceId))
      .toEqual({ account_id: null });
  });

  test("anchors recurring birthdays to the season without changing their source date", () => {
    expect(birthdayOccurrence("2026-07-01", 8, 8)).toBe("2026-08-08");
    expect(birthdayOccurrence("2026-07-01", 3, 20)).toBe("2027-03-20");
    expect(birthdayOccurrence("2026-07-01", 2, 29)).toBe("2028-02-29");
  });

  test("refuses unverified birthday and account claims without evidence", () => {
    expect(() => parseResourceWrite("account", {
      ownerType: "anime", ownerId: "anime-kimishinu", platform: "X", handle: "@bad",
      url: "https://x.com/bad", verified: true, monitorMode: "local", verificationSourceUrl: null,
    })).toThrow("一手验证链接");
    expect(() => parseResourceWrite("cast", {
      personId: null, characterName: "角色", characterNameNative: null, characterProfile: null,
      personName: "声优", personNameNative: null, birthdayMonth: 4, birthdayDay: 31,
      birthdayYear: null, birthdayTimezone: "Asia/Tokyo", birthdaySourceUrl: "https://example.com",
      birthdayVerified: true, sortOrder: 0,
    })).toThrow("日期不成立");
  });
});
