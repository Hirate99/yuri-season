import { describe, expect, test } from "bun:test";
import type { AdminAnimeResources, AdminAnimeSummary, SearchMemorySummary } from "@/domain";
import { buildDiscoveryPlan } from "../scripts/lib/discovery-query-plan";

const anime = {
  id: "anime-1", slug: "work", titleZh: "作品", titleJa: "作品日本語", titleEn: null,
  synopsis: "", editorialNote: null, yuriKind: "strong", yuriStatus: "confirmed", status: "airing",
  premiereAt: "2026-07-01", episodeCount: null, episodeDurationMin: null,
  premiereEpisodeCount: 1, latestVerifiedEpisode: null, latestEpisodeSourceUrl: null,
  latestEpisodeCheckedAt: null, currentEpisode: 6, studio: null,
  sourceMaterial: null, officialUrl: null, bangumiUrl: null, officialXUrl: null, coverUrl: null,
  coverSourceUrl: null, titleZhSourceUrl: null, mainCharacterSourceUrl: null,
  mainCharacterExpectedCount: null, mainCharacterCheckedAt: null,
  visualTheme: "#fff", featured: true, primarySlot: null, latestFeedAt: null,
  feedCount: 0, seasonId: "season-1", seasonLabel: "2026 夏",
} satisfies AdminAnimeSummary;

const resources = {
  broadcasts: [], accounts: [], staff: [], sources: [], events: [], media: [],
  discussions: [{ id: "discussion-1", platform: "百合会", title: "专楼", url: "https://bbs.yamibo.com/thread-1.html", note: null, isActive: true, lastActivityAt: null, lastCheckedAt: null, sharedAnimeCount: 1 }],
  themeSongs: [],
  cast: [{ id: "cast-1", characterId: "character-1", characterName: "角色", characterNameNative: "キャラ",
    nameSourceUrl: null, characterProfile: null, profileSourceUrl: null, portraitUrl: null,
    portraitSourceUrl: null, isMainGroup: true, personId: "person-1", personName: "声优",
    personNameNative: "声優", birthdayMonth: null, birthdayDay: null, birthdayYear: null,
    birthdayTimezone: "Asia/Tokyo", birthdaySourceUrl: null, birthdayVerified: false, sortOrder: 0 }],
} satisfies AdminAnimeResources;

function plan(memory: SearchMemorySummary[] = [], force = false) {
  return buildDiscoveryPlan({
    seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime], resources: { "anime-1": resources },
    memory, memoryHits: [], now: new Date("2026-08-11T20:00:00Z"), force, limit: 100,
  });
}

describe("discovery query planning", () => {
  test("keeps routine updates to registered verified X timelines", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      staff: [
        { id: "staff-author", personId: "person-author", name: "原作者", nameNative: null,
          primaryKind: "author", role: "原作", profileUrl: null, sortOrder: 0 },
        { id: "staff-director", personId: "person-director", name: "监督", nameNative: null,
          primaryKind: "staff", role: "监督", profileUrl: null, sortOrder: 1 },
      ],
      accounts: [
        {
          id: "account-work-x", ownerType: "anime", ownerId: anime.id, ownerLabel: anime.titleZh,
          platform: "X", handle: "@work", url: "https://x.com/work", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
        },
        {
          id: "account-cast-x", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
          platform: "X", handle: "@voice", url: "https://x.com/voice", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/cast", verifiedAt: "2026-08-11T00:00:00Z",
        },
        {
          id: "account-author-x", ownerType: "person", ownerId: "person-author", ownerLabel: "原作者",
          platform: "X", handle: "@author", url: "https://x.com/author", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/author", verifiedAt: "2026-08-11T00:00:00Z",
        },
        {
          id: "account-director-x", ownerType: "person", ownerId: "person-director", ownerLabel: "监督",
          platform: "X", handle: "@director", url: "https://x.com/director", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/director", verifiedAt: "2026-08-11T00:00:00Z",
        },
        {
          id: "account-cast-instagram", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
          platform: "Instagram", handle: "voice", url: "https://www.instagram.com/voice/", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/cast", verifiedAt: "2026-08-11T00:00:00Z",
        },
      ],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, profile: "routine", limit: 100,
    });

    expect(new Set(queries.map((query) => query.targetKey))).toEqual(new Set([
      "updates:anime-1:account-work-x",
      "updates:anime-1:account-cast-x",
      "updates:anime-1:account-author-x",
      "updates:anime-1:account-director-x",
    ]));
    expect(queries.every((query) => query.accountId && query.platform?.toLowerCase() === "x"
      && query.operation === "timeline_scan")).toBe(true);
    expect(queries.find((query) => query.accountId === "account-author-x")?.priority).toBe(4);
    expect(queries.find((query) => query.accountId === "account-director-x")?.priority).toBe(3);
    expect(queries.some((query) => query.operation === "tag_scan"
      || query.targetKey.startsWith("account:") || query.targetKey.startsWith("community:")
      || query.targetKey.startsWith("media:") || query.targetKey.startsWith("music:"))).toBe(false);
  });

  test("requires an explicit account-discovery profile and respects person/platform scope", () => {
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime], resources: { "anime-1": resources },
      memory: [], memoryHits: [], now: new Date("2026-08-11T20:00:00Z"), force: false,
      profile: "account-discovery", personIds: new Set(["person-1"]), platforms: new Set(["x"]), limit: 100,
    });

    expect(queries.map((query) => query.targetKey)).toEqual(["account:official-x"]);
    expect(queries[0]).toMatchObject({ scopeType: "person", scopeId: "person-1", platform: "X" });
  });

  test("keeps general discovery from expanding into account discovery", () => {
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime], resources: { "anime-1": resources },
      memory: [], memoryHits: [], now: new Date("2026-08-11T20:00:00Z"), force: false,
      profile: "discovery", limit: 100,
    });

    expect(queries.some((query) => query.targetKey === "social:work"
      || query.targetKey.startsWith("account:official-") || query.targetKey.startsWith("verification:"))).toBe(false);
    expect(queries.some((query) => query.targetKey.startsWith("community:")
      || query.targetKey.startsWith("media:"))).toBe(true);
  });

  test("plans database-aware community and account discovery without birthday polling", () => {
    const queries = plan();
    expect(queries.find((query) => query.targetKey === "music:theme-songs"))
      .toMatchObject({ searchKind: "official_news", priority: 5, maxFreshHours: 30 * 24 });
    expect(queries.filter((query) => query.targetKey === "community:yamibo-recent")).toHaveLength(1);
    expect(queries.find((query) => query.targetKey === "community:yamibo-recent"))
      .toMatchObject({ scopeType: "season", searchKind: "community", maxFreshHours: 30 * 24, priority: 5 });
    expect(queries.find((query) => query.targetKey === "community:yamibo-recent")?.queryText)
      .toContain("https://bbs.yamibo.com/forum-5-1.html");
    expect(queries.some((query) => query.targetKey === "community:tieba")).toBe(true);
    expect(queries.find((query) => query.targetKey === "community:moesen"))
      .toMatchObject({ priority: 3, maxFreshHours: 30 * 24 });
    expect(queries.some((query) => query.targetKey === "community:nga")).toBe(true);
    expect(queries.some((query) => query.scopeId === "character-1" && query.searchKind === "birthday")).toBe(false);
    expect(queries.some((query) => query.scopeId === "person-1"
      && query.targetKey === "account:official-x" && query.platform === "X")).toBe(true);
    expect(queries.some((query) => query.scopeId === "person-1"
      && query.targetKey === "account:official-instagram" && query.platform === "Instagram")).toBe(true);
    expect(queries.filter((query) => query.contentLane === "fanwork").map((query) => query.platform).sort())
      .toEqual(["Instagram", "Pixiv", "X"]);
    const pixivFanwork = queries.find((query) => query.targetKey === "media:fanwork:pixiv");
    expect(pixivFanwork).toMatchObject({ priority: 3, maxFreshHours: 30 * 24, platform: "Pixiv" });
    expect(pixivFanwork?.queryText).toContain("pixiv tag search: 作品日本語");
    expect(pixivFanwork?.queryText).toContain("ajax/search/artworks/");
    expect(queries.find((query) => query.targetKey === "media:fanwork:instagram"))
      .toMatchObject({ priority: 1, maxFreshHours: 30 * 24 });
  });

  test("plans birthday research only for an explicit audit", () => {
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime], resources: { "anime-1": resources },
      memory: [], memoryHits: [], now: new Date("2026-08-11T20:00:00Z"),
      force: false, includeBirthdays: true, limit: 100,
    });
    expect(queries.some((query) => query.scopeId === "character-1" && query.searchKind === "birthday"))
      .toBe(true);
  });

  test("treats exhausted durable search memory as satisfied unless forced", () => {
    const exhausted = [{
      id: "memory-birthday", scopeType: "character", scopeId: "character-1", searchKind: "birthday",
      targetKey: "birthday:official", queryText: "audited", status: "exhausted",
      lastResultHash: null, lastResultCount: 1, usefulResultCount: 0,
      searchedAt: "2026-08-10T00:00:00Z", nextSearchAt: null, notes: null,
      seenCount: 0, candidateCount: 0, publishedCount: 0, heldCount: 0,
      rejectedCount: 0, ignoredCount: 1,
    }] satisfies SearchMemorySummary[];
    const common = {
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime], resources: { "anime-1": resources },
      memory: exhausted, memoryHits: [], now: new Date("2026-08-11T20:00:00Z"),
      includeBirthdays: true, limit: 100,
    };
    expect(buildDiscoveryPlan({ ...common, force: false }).some((query) => query.searchKind === "birthday"))
      .toBe(false);
    expect(buildDiscoveryPlan({ ...common, force: true }).some((query) => query.searchKind === "birthday"))
      .toBe(true);
  });

  test("keeps Mengzhan Bar separate from an ordinary work Tieba thread", () => {
    const tiebaResources: AdminAnimeResources = {
      ...resources,
      discussions: [{
        ...resources.discussions[0],
        id: "discussion-tieba",
        platform: "贴吧",
        url: "https://tieba.baidu.com/p/123456",
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": tiebaResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    expect(queries.some((query) => query.targetKey === "community:tieba")).toBe(false);
    expect(queries.some((query) => query.targetKey === "community:moesen")).toBe(true);
  });

  test("limits birthday discovery to the recurring protagonist group", () => {
    const supportingResources: AdminAnimeResources = {
      ...resources,
      cast: [{ ...resources.cast[0], characterId: "supporting-1", isMainGroup: false }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": supportingResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    expect(queries.some((query) => query.scopeId === "supporting-1" && query.searchKind === "birthday"))
      .toBe(false);
    expect(queries.some((query) => query.scopeId === "person-1" && query.searchKind === "social"))
      .toBe(false);
  });

  test("does not search ordinary staff accounts unless explicitly forced", () => {
    const resourcesWithOrdinaryStaff: AdminAnimeResources = {
      ...resources,
      cast: [],
      staff: [{
        id: "staff-ordinary", personId: "person-staff", name: "普通制作人员", nameNative: null,
        primaryKind: "staff", role: "摄影监督", profileUrl: null, sortOrder: 1,
      }],
    };
    const common = {
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": resourcesWithOrdinaryStaff }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), limit: 100,
    };
    expect(buildDiscoveryPlan({ ...common, force: false })
      .some((query) => query.scopeId === "person-staff" && query.searchKind === "social")).toBe(false);
    expect(buildDiscoveryPlan({ ...common, force: true })
      .some((query) => query.scopeId === "person-staff" && query.searchKind === "social")).toBe(true);
  });

  test("respects next search time unless a from-scratch audit is forced", () => {
    const futureMemory = [{
      id: "memory-1", scopeType: "anime", scopeId: "anime-1", searchKind: "official_news",
      targetKey: "official:work", queryText: "old", status: "active", lastResultHash: null,
      lastResultCount: 0, usefulResultCount: 0, searchedAt: "2026-08-10T00:00:00Z",
      nextSearchAt: "2026-08-20T00:00:00Z", notes: null, seenCount: 0, candidateCount: 0,
      publishedCount: 0, heldCount: 0, rejectedCount: 0, ignoredCount: 0,
    }] satisfies SearchMemorySummary[];
    expect(plan(futureMemory).some((query) => query.targetKey === "official:work")).toBe(false);
    expect(plan(futureMemory, true).some((query) => query.targetKey === "official:work")).toBe(true);
  });

  test("does not rediscover registered official sources and work accounts", () => {
    const completeResources: AdminAnimeResources = {
      ...resources,
      accounts: [{
        id: "account-work", ownerType: "anime", ownerId: anime.id, ownerLabel: anime.titleZh,
        platform: "x", handle: "@work", url: "https://x.com/work", verified: true,
        monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
      }],
      sources: [{
        id: "source-work", accountId: null, sourceType: "official_page", changeKind: "feed_candidate",
        label: "公式 NEWS", url: "https://example.com/news", itemUrlTemplate: null,
        trustLevel: "official", publicTextMode: "full_with_translation", maxPublicCharacters: 24000,
        pollIntervalMin: 1440, cadenceProfile: "local", enabled: true,
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": completeResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    expect(queries.some((query) => query.targetKey === "official:work")).toBe(false);
    expect(queries.some((query) => query.targetKey === "social:work")).toBe(false);
    expect(queries.some((query) => query.targetKey === "updates:anime-1:account-work"
      && query.queryText.toLowerCase().includes("x official account timeline: https://x.com/work")
      && query.queryText.includes("after:2026-07-12")
      && query.priority === 5 && query.maxFreshHours === 24)).toBe(true);
    expect(queries.some((query) => query.scopeId === "person-1" && query.searchKind === "social")).toBe(true);
  });

  test("turns existing unverified accounts into first-party verification work", () => {
    const resourcesWithPendingAccounts: AdminAnimeResources = {
      ...resources,
      accounts: [
        {
          id: "account-work-pending", ownerType: "anime", ownerId: anime.id, ownerLabel: anime.titleZh,
          platform: "X", handle: "@work_pending", url: "https://x.com/work_pending", verified: false,
          monitorMode: "disabled", verificationSourceUrl: null, verifiedAt: null,
        },
        {
          id: "account-cast-x-pending", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
          platform: "X", handle: "@voice_pending", url: "https://x.com/voice_pending", verified: false,
          monitorMode: "disabled", verificationSourceUrl: null, verifiedAt: null,
        },
        {
          id: "account-cast-instagram-pending", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
          platform: "Instagram", handle: "voice_pending", url: "https://www.instagram.com/voice_pending/", verified: false,
          monitorMode: "disabled", verificationSourceUrl: null, verifiedAt: null,
        },
      ],
    };
    const common = {
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": resourcesWithPendingAccounts }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), limit: 100,
    };

    const ordinary = buildDiscoveryPlan({ ...common, force: false });
    expect(ordinary.some((query) => query.targetKey === "social:work")).toBe(false);
    expect(ordinary.some((query) => query.scopeId === "person-1"
      && query.targetKey.startsWith("account:official-"))).toBe(false);
    expect(ordinary.filter((query) => query.targetKey.startsWith("verification:"))).toHaveLength(3);
    expect(ordinary.find((query) => query.targetKey === "verification:account-work-pending"))
      .toMatchObject({ stage: "people", socialAuditEligible: true, contentLane: "official" });
    expect(ordinary.find((query) => query.targetKey === "verification:account-cast-x-pending")?.queryText)
      .toContain("first-party");

    const forced = buildDiscoveryPlan({ ...common, force: true });
    expect(forced.some((query) => query.targetKey === "social:work")).toBe(true);
    expect(forced.filter((query) => query.targetKey.startsWith("verification:"))).toHaveLength(3);
    expect(forced.some((query) => query.scopeId === "person-1"
      && query.targetKey.startsWith("account:official-"))).toBe(false);
  });

  test("plans projection reconciliation for verified songs missing Apple action or artwork", () => {
    const resourcesWithMusic: AdminAnimeResources = {
      ...resources,
      themeSongs: [{
        id: "theme-song-opening", trackId: "track-opening", songKind: "opening", sequence: 1, title: "Blue Hour",
        artist: "Example Artist", lyricist: null, composer: null, arranger: null,
        episodeRange: null, sortOrder: 0, officialUrl: "https://music.example.test/listen",
        coverUrl: null, coverSourceUrl: null, sourceUrl: "https://anime.example.test/music",
        verified: true, sharedAnimeCount: 1,
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": resourcesWithMusic }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    const reconciliation = queries.find((query) => query.targetKey === "music:theme-song-projection");

    expect(queries.some((query) => query.targetKey === "music:theme-songs")).toBe(false);
    expect(reconciliation).toMatchObject({ searchKind: "official_news", priority: 4, maxFreshHours: 30 * 24 });
    expect(reconciliation?.queryText).toContain('"Blue Hour / Example Artist"');
    expect(reconciliation?.queryText).toContain("Apple Music");
  });

  test("still reconciles a verified song with artwork but no Apple action", () => {
    const completeMusic: AdminAnimeResources = {
      ...resources,
      themeSongs: [{
        id: "theme-song-ending", trackId: "track-ending", songKind: "ending", sequence: 1, title: "Afterglow",
        artist: "Example Artist", lyricist: null, composer: null, arranger: null,
        episodeRange: null, sortOrder: 0, officialUrl: null,
        coverUrl: "https://music.example.test/afterglow.jpg",
        coverSourceUrl: "https://music.example.test/releases/afterglow",
        sourceUrl: "https://anime.example.test/music", verified: true, sharedAnimeCount: 1,
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": completeMusic }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });

    expect(queries.some((query) => query.targetKey === "music:theme-song-projection")).toBe(true);
  });

  test("does not search again when every verified song has a complete Apple projection", () => {
    const completeMusic: AdminAnimeResources = {
      ...resources,
      themeSongs: [{
        id: "theme-song-ending", trackId: "track-ending", songKind: "ending", sequence: 1, title: "Afterglow",
        artist: "Example Artist", lyricist: null, composer: null, arranger: null,
        episodeRange: null, sortOrder: 0,
        officialUrl: "https://music.apple.com/jp/album/afterglow/123?i=456",
        coverUrl: "https://is1-ssl.mzstatic.com/afterglow.jpg",
        coverSourceUrl: "https://music.apple.com/jp/album/afterglow/123?i=456",
        sourceUrl: "https://anime.example.test/music", verified: true, sharedAnimeCount: 1,
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": completeMusic }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });

    expect(queries.some((query) => query.targetKey.startsWith("music:"))).toBe(false);
  });

  test("plans work-related posts for verified cast accounts", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      accounts: [{
        id: "account-cast", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
        platform: "X", handle: "@voice_actor", url: "https://x.com/voice_actor", verified: true,
        monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    expect(queries.some((query) => query.targetKey === "updates:anime-1:account-cast"
      && query.scopeType === "person" && query.scopeId === "person-1"
      && query.queryText.includes("X verified cast/creator/staff timeline: https://x.com/voice_actor")
      && query.queryText.includes('explicitly connected to "作品日本語"')
      && query.operation === "timeline_scan" && query.maxFreshHours === 24 && query.priority === 3
      && query.accountId === "account-cast" && query.personId === "person-1"
      && query.contentLane === "cast" && query.characterIds?.includes("character-1"))).toBe(true);
    expect(queries.some((query) => query.scopeId === "person-1"
      && query.targetKey === "account:official-x")).toBe(false);
  });

  test("respects search-memory cooling for verified account updates", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      accounts: [{
        id: "account-work", ownerType: "anime", ownerId: anime.id, ownerLabel: anime.titleZh,
        platform: "X", handle: "@work", url: "https://x.com/work", verified: true,
        monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
      }],
    };
    const memory = [{
      id: "memory-account-update", scopeType: "anime", scopeId: anime.id, searchKind: "social",
      targetKey: "updates:anime-1:account-work", queryText: "old", status: "active",
      lastResultHash: null, lastResultCount: 0, usefulResultCount: 0,
      searchedAt: "2026-08-10T00:00:00Z", nextSearchAt: "2026-08-17T00:00:00Z", notes: null,
      seenCount: 0, candidateCount: 0, publishedCount: 0, heldCount: 0,
      rejectedCount: 0, ignoredCount: 0,
    }] satisfies SearchMemorySummary[];
    const input = {
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory, memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), limit: 100,
    };
    expect(buildDiscoveryPlan({ ...input, force: false })
      .some((query) => query.targetKey === "updates:anime-1:account-work")).toBe(false);
    expect(buildDiscoveryPlan({ ...input, force: true })
      .some((query) => query.targetKey === "updates:anime-1:account-work"
        && query.queryText.includes("X official account timeline: https://x.com/work")
        && query.queryText.includes("after:2026-08-09"))).toBe(true);
  });

  test("plans official X timeline and related-tag coverage for every current work", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      accounts: [{
        id: "account-work-x", ownerType: "anime", ownerId: anime.id, ownerLabel: anime.titleZh,
        platform: "X", handle: "@work", url: "https://x.com/work", verified: true,
        monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    const account = queries.find((query) => query.accountId === "account-work-x");
    expect(account).toMatchObject({
      priority: 5, contentLane: "official", operation: "timeline_scan",
      stage: "official", maxFreshHours: 24, socialAuditEligible: true,
      completionPolicy: { mustReachPreviousCursor: true, searchEngineCanComplete: false },
    });
    expect(account?.queryText).toContain("X official account timeline: https://x.com/work");
    const tags = queries.find((query) => query.targetKey === "updates:anime-1:x-tags");
    expect(tags).toMatchObject({
      priority: 5, platform: "X", contentLane: "official",
      operation: "tag_scan", stage: "tags", maxFreshHours: 24,
    });
    expect(tags?.queryText).toContain("X latest hashtag timelines");
    expect(tags?.queryText).toContain("verified official profiles");
    expect(tags?.queryText).toContain("角色");
  });

  test("reuses terms learned from recent official posts in the next tag scan", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      accounts: [{
        id: "account-work-x", ownerType: "anime", ownerId: anime.id, ownerLabel: anime.titleZh,
        platform: "X", handle: "@work", url: "https://x.com/work", verified: true,
        monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
      }],
    };
    const memory = [{
      id: "memory-tags", scopeType: "anime", scopeId: anime.id, searchKind: "social",
      targetKey: "updates:anime-1:x-tags", queryText: "old", status: "active",
      lastResultHash: null, lastResultCount: 1, usefulResultCount: 1,
      searchedAt: "2026-08-10T00:00:00Z", nextSearchAt: "2026-08-11T00:00:00Z", notes: null,
      seenCount: 1, candidateCount: 1, publishedCount: 1, heldCount: 0,
      rejectedCount: 0, ignoredCount: 0, cursor: { activeTerms: ["#新企划标签"] },
    }] satisfies SearchMemorySummary[];

    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory, memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });

    expect(queries.find((query) => query.targetKey === "updates:anime-1:x-tags")?.queryText)
      .toContain("#新企划标签");
  });

  test("keeps a social audit focused and orders whole-season coverage before people", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      accounts: [
        {
          id: "account-work-x", ownerType: "anime", ownerId: anime.id, ownerLabel: anime.titleZh,
          platform: "X", handle: "@work", url: "https://x.com/work", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
        },
        {
          id: "account-main-cast", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
          platform: "X", handle: "@voice", url: "https://x.com/voice", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/cast", verifiedAt: "2026-08-11T00:00:00Z",
        },
      ],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, profile: "social-audit", limit: 100,
    });

    expect(queries.map((query) => query.stage)).toEqual(["official", "tags", "people"]);
    expect(queries.every((query) => query.searchKind === "social" && query.socialAuditEligible)).toBe(true);
    expect(queries.some((query) => query.targetKey.startsWith("music:")
      || query.targetKey.startsWith("media:") || query.targetKey.startsWith("community:"))).toBe(false);
  });

  test("plans Instagram updates separately from X account coverage", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      accounts: [
        {
          id: "account-cast-x", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
          platform: "X", handle: "@voice_actor", url: "https://x.com/voice_actor", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
        },
        {
          id: "account-cast-instagram", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
          platform: "Instagram", handle: "@voice_actor", url: "https://www.instagram.com/voice_actor/", verified: true,
          monitorMode: "local", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
        },
      ],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    expect(queries.some((query) => query.accountId === "account-cast-instagram"
      && query.queryText === 'site:instagram.com/voice_actor "作品日本語" after:2026-07-12'
      && query.platform === "Instagram" && query.contentLane === "cast")).toBe(true);
    expect(queries.some((query) => query.scopeId === "person-1"
      && query.targetKey.startsWith("account:official-"))).toBe(false);
  });

  test("monitors verified 2.5D project personas without requiring a title match", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      cast: resources.cast.map((item) => ({
        ...item,
        personName: item.characterName,
        personNameNative: item.characterNameNative,
      })),
      accounts: [{
        id: "account-persona-x", ownerType: "person", ownerId: "person-1", ownerLabel: "Project Persona",
        platform: "X", handle: "@project_persona", url: "https://x.com/project_persona", verified: true,
        monitorMode: "local", verificationSourceUrl: "https://example.com/project-member", verifiedAt: "2026-08-11T00:00:00Z",
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    const query = queries.find((item) => item.accountId === "account-persona-x");
    expect(query).toMatchObject({ maxFreshHours: 24, priority: 4, contentLane: "cast" });
    expect(query?.queryText).toContain("X account timeline: https://x.com/project_persona");
    expect(query?.queryText).toContain("public professional or creative activity");
    expect(query?.queryText).not.toContain(anime.titleJa);
  });

  test("skips account discovery when monitoring is disabled or a feed source exists", () => {
    const monitoredResources: AdminAnimeResources = {
      ...resources,
      accounts: [
        {
          id: "account-disabled", ownerType: "anime", ownerId: anime.id, ownerLabel: anime.titleZh,
          platform: "X", handle: "@disabled", url: "https://x.com/disabled", verified: true,
          monitorMode: "disabled", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
        },
        {
          id: "account-sourced", ownerType: "person", ownerId: "person-1", ownerLabel: "声优",
          platform: "Bluesky", handle: "voice.example", url: "https://bsky.app/profile/voice.example", verified: true,
          monitorMode: "api", verificationSourceUrl: "https://example.com/official", verifiedAt: "2026-08-11T00:00:00Z",
        },
      ],
      sources: [{
        id: "source-account", accountId: "account-sourced", sourceType: "bluesky", changeKind: "feed_candidate",
        label: "声优 Bluesky", url: "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=voice.example",
        itemUrlTemplate: null, trustLevel: "verified_creator", publicTextMode: "full_with_translation",
        maxPublicCharacters: 6000, pollIntervalMin: 1440,
        cadenceProfile: "local", enabled: true,
      }],
    };
    const queries = buildDiscoveryPlan({
      seasonId: "season-1", seasonLabel: "2026 夏", anime: [anime],
      resources: { "anime-1": monitoredResources }, memory: [], memoryHits: [],
      now: new Date("2026-08-11T20:00:00Z"), force: false, limit: 100,
    });
    expect(queries.some((query) => query.targetKey.includes("account-disabled"))).toBe(false);
    expect(queries.some((query) => query.targetKey.includes("account-sourced"))).toBe(false);
  });
});
