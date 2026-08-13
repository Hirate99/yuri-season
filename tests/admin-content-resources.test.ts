import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseResourceWrite } from "~/http/input/resource-input";
import { createAdminResource, deleteAdminResource, updateAdminResource } from "~/application/admin/resources";
import { readAdminAnimeResources } from "~/repositories/admin/resources";
import { readDiscussions, readMedia } from "~/repositories/feed";
import { deleteDiscussionEverywhere } from "~/repositories/admin/discussion";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("Admin related content", () => {
  test("maintains events, media and concentrated discussion threads", async () => {
    const animeId = "anime-kimishinu";
    const eventWrite = parseResourceWrite("event", {
      personId: null, characterId: null, eventType: "stream", title: "公式直播",
      startsAt: "2026-08-20T19:00:00+09:00", endsAt: null, timezone: "Asia/Tokyo",
      recurrenceRule: null, sourceUrl: "https://example.com/live", verified: true, status: "scheduled",
    });
    const mediaWrite = parseResourceWrite("media", {
      personId: null, characterId: null, contentClass: "creator_art", title: "贺图",
      creatorName: "作者", creatorUrl: "https://example.com/creator",
      originalUrl: "https://example.com/admin-media", previewUrl: null,
      presentationMode: "link_only", safetyRating: "unknown", spoilerLevel: "none",
      rightsNote: null, publishedAt: "2026-08-11T12:00:00+09:00",
    });
    const discussionWrite = parseResourceWrite("discussion", {
      platform: "百合会", title: "集中讨论", url: "https://example.com/admin-thread",
      note: null, isActive: true, lastActivityAt: "2026-08-11T12:00:00Z",
    });
    const eventId = await createAdminResource(database.binding(), animeId, eventWrite);
    const mediaId = await createAdminResource(database.binding(), animeId, mediaWrite);
    const discussionId = await createAdminResource(database.binding(), animeId, discussionWrite);

    let resources = await readAdminAnimeResources(database.binding(), animeId);
    expect(resources.events.find((item) => item.id === eventId)).toMatchObject({ verified: true, eventType: "stream" });
    expect(resources.media.find((item) => item.id === mediaId)?.safetyRating).toBe("unknown");
    expect(resources.discussions.find((item) => item.id === discussionId)?.isActive).toBe(true);
    expect((await readMedia(database.binding(), animeId)).some((item) => item.id === mediaId)).toBe(false);
    expect((await readDiscussions(database.binding(), animeId)).some((item) => item.id === discussionId)).toBe(true);

    await updateAdminResource(database.binding(), animeId, "media", mediaId,
      parseResourceWrite("media", { ...mediaWrite.value, safetyRating: "safe" }));
    await updateAdminResource(database.binding(), animeId, "discussion", discussionId,
      parseResourceWrite("discussion", { ...discussionWrite.value, isActive: false }));
    expect((await readMedia(database.binding(), animeId)).some((item) => item.id === mediaId)).toBe(true);
    expect((await readDiscussions(database.binding(), animeId)).some((item) => item.id === discussionId)).toBe(false);

    await deleteAdminResource(database.binding(), animeId, "event", eventId);
    await deleteAdminResource(database.binding(), animeId, "media", mediaId);
    await deleteDiscussionEverywhere(database.binding(), discussionId, "测试清理");
    resources = await readAdminAnimeResources(database.binding(), animeId);
    expect(resources.events.some((item) => item.id === eventId)).toBe(false);
    expect(resources.media.some((item) => item.id === mediaId)).toBe(false);
    expect(resources.discussions.some((item) => item.id === discussionId)).toBe(false);
  });

  test("requires evidence for verified events and permission for mirrored media", () => {
    expect(() => parseResourceWrite("event", {
      personId: null, characterId: null, eventType: "event", title: "无来源活动",
      startsAt: "2026-08-20", endsAt: null, timezone: "Asia/Tokyo", recurrenceRule: null,
      sourceUrl: null, verified: true, status: "scheduled",
    })).toThrow("原始来源");
    expect(() => parseResourceWrite("media", {
      personId: null, characterId: null, contentClass: "fanart", title: "镜像",
      creatorName: "作者", creatorUrl: null, originalUrl: "https://example.com/original",
      previewUrl: "https://example.com/preview.jpg", presentationMode: "mirrored_with_permission",
      safetyRating: "safe", spoilerLevel: "none", rightsNote: null,
      publishedAt: "2026-08-11T12:00:00Z",
    })).toThrow("授权说明");
  });

  test("reuses one discussion thread across multiple works", async () => {
    const write = parseResourceWrite("discussion", {
      platform: "百合会", title: "2026 夏季动画集中讨论",
      url: "https://bbs.example.test/thread-shared", note: null,
      isActive: true, lastActivityAt: "2026-08-11T12:00:00Z",
    });
    const firstId = await createAdminResource(database.binding(), "anime-kimishinu", write);
    const secondId = await createAdminResource(database.binding(), "anime-taiari", write);
    expect(secondId).toBe(firstId);
    expect((await readAdminAnimeResources(database.binding(), "anime-kimishinu"))
      .discussions.find((item) => item.id === firstId)?.sharedAnimeCount).toBe(2);

    await deleteAdminResource(database.binding(), "anime-kimishinu", "discussion", firstId);
    expect((await readDiscussions(database.binding(), "anime-taiari"))
      .some((item) => item.id === firstId)).toBe(true);
    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM discussions WHERE id = ?").get(firstId))
      .toEqual({ count: 1 });
    await expect(deleteAdminResource(database.binding(), "anime-taiari", "discussion", firstId))
      .rejects.toThrow("最后一个作品关联");
  });

  test("shares verified music tracks while keeping per-work OP and ED usage", async () => {
    const opening = parseResourceWrite("theme_song", {
      songKind: "opening", sequence: 1, title: "Shared Song", artist: "Artist Unit",
      lyricist: "Lyricist", composer: "Composer", arranger: null, episodeRange: "1–6",
      officialUrl: "https://music.example.test/shared-song",
      coverUrl: "https://music.example.test/shared-song.jpg",
      coverSourceUrl: "https://music.example.test/shared-song",
      sourceUrl: "https://anime.example.test/music", verified: true, sortOrder: 0,
    });
    const firstLink = await createAdminResource(database.binding(), "anime-kimishinu", opening);
    const ending = parseResourceWrite("theme_song", { ...opening.value, songKind: "ending", episodeRange: null });
    const secondLink = await createAdminResource(database.binding(), "anime-taiari", ending);
    const first = (await readAdminAnimeResources(database.binding(), "anime-kimishinu"))
      .themeSongs.find((item) => item.id === firstLink);
    const second = (await readAdminAnimeResources(database.binding(), "anime-taiari"))
      .themeSongs.find((item) => item.id === secondLink);
    expect(first?.trackId).toBe(second?.trackId);
    expect(first).toMatchObject({ songKind: "opening", sharedAnimeCount: 2, verified: true });
    expect(second).toMatchObject({ songKind: "ending", coverUrl: "https://music.example.test/shared-song.jpg" });

    await deleteAdminResource(database.binding(), "anime-kimishinu", "theme_song", firstLink);
    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM music_tracks").get()).toEqual({ count: 1 });
  });

  test("requires a source for verified theme songs and jacket art", () => {
    expect(() => parseResourceWrite("theme_song", {
      songKind: "opening", sequence: 1, title: "Song", artist: "Artist",
      lyricist: null, composer: null, arranger: null, episodeRange: null,
      officialUrl: null, coverUrl: null, coverSourceUrl: null,
      sourceUrl: null, verified: true, sortOrder: 0,
    })).toThrow("官方资料来源");
    expect(() => parseResourceWrite("theme_song", {
      songKind: "opening", sequence: 1, title: "Song", artist: "Artist",
      lyricist: null, composer: null, arranger: null, episodeRange: null,
      officialUrl: null, coverUrl: "https://example.com/jacket.jpg", coverSourceUrl: null,
      sourceUrl: "https://example.com/music", verified: true, sortOrder: 0,
    })).toThrow("图片来源");
  });
});
