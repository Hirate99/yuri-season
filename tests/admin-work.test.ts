import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { animeCreateSchema, animePatchSchema } from "@/domain/inputs/anime";
import { createAnime, patchAnime } from "~/repositories/anime/write";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("Admin work editing", () => {
  test("validates and persists the full work profile through Drizzle", async () => {
    const patch = animePatchSchema.parse({
      titleZh: "再见菈菈",
      titleJa: "さよならララ",
      synopsis: "两百年后苏醒的人鱼菈菈，与大津茉里共同生活。",
      studio: "Kinema citrus",
      sourceMaterial: "原创",
      premiereAt: "2026-07-06T00:30:00+09:00",
      episodeCount: 13,
      episodeDurationMin: 24,
      premiereEpisodeCount: 2,
      latestVerifiedEpisode: 6,
      latestEpisodeSourceUrl: "https://goodbyelara.com/story/",
      latestEpisodeCheckedAt: "2026-08-11T23:00:00+09:00",
      yuriKind: "strong",
      yuriStatus: "pending",
      status: "airing",
      officialUrl: "https://goodbyelara.com",
      bangumiUrl: "https://bgm.tv/subject/495291",
      coverUrl: "https://lain.bgm.tv/pic/cover/l/495291.jpg",
      visualTheme: "lake",
      featured: true,
    });
    await patchAnime(database.binding(), "anime-goodbye-lara", patch);

    const row = database.sqlite
      .query(
        `
      SELECT title_zh, episode_count, episode_duration_min, premiere_episode_count,
        latest_verified_episode, latest_episode_source_url, latest_episode_checked_at,
        studio, source_material,
        yuri_status, official_url, featured
      FROM anime WHERE id = 'anime-goodbye-lara'
    `,
      )
      .get();
    expect(row).toEqual({
      title_zh: "再见菈菈",
      episode_count: 13,
      episode_duration_min: 24,
      premiere_episode_count: 2,
      latest_verified_episode: 6,
      latest_episode_source_url: "https://goodbyelara.com/story/",
      latest_episode_checked_at: "2026-08-11T23:00:00+09:00",
      studio: "Kinema citrus",
      source_material: "原创",
      yuri_status: "pending",
      official_url: "https://goodbyelara.com/",
      featured: 1,
    });
  });

  test("rejects invalid enum, URL and numeric fields", () => {
    expect(() => animePatchSchema.parse({ yuriStatus: "maybe" })).toThrow("yuriStatus 格式不正确");
    expect(() => animePatchSchema.parse({ officialUrl: "javascript:alert(1)" })).toThrow(
      "只支持 HTTP(S)",
    );
    expect(() => animePatchSchema.parse({ episodeCount: 12.5 })).toThrow("需要是 1–1000 的整数");
  });

  test("creates a work directly in a selected season", async () => {
    const id = await createAnime(
      database.binding(),
      animeCreateSchema.parse({
        seasonId: "season-2026-summer",
        slug: "new-yuri-work",
        titleZh: "新作",
        titleJa: "新作",
        synopsis: "用于验证下一季度作品目录创建流程的完整简介。",
        yuriKind: "adjacent",
        yuriStatus: "pending",
        status: "upcoming",
        premiereAt: "2026-10-01T00:30:00+09:00",
        visualTheme: "ink",
        featured: false,
      }),
    );
    expect(
      database.sqlite.query("SELECT season_id, slug, yuri_status FROM anime WHERE id = ?").get(id),
    ).toEqual({
      season_id: "season-2026-summer",
      slug: "new-yuri-work",
      yuri_status: "pending",
    });
  });
});
