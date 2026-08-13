import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ingestResearchBatch } from "../worker/research/batch";
import { applyCandidateDecision, createCandidate } from "../worker/repositories/mutations";
import { rememberSearch } from "../worker/repositories/search-memory";
import { TestD1 } from "./support/d1-adapter";
import { readAdminDashboard } from "../worker/repositories/admin";
import { readDiscussions, readFeed, readMedia } from "../worker/repositories/feed";
import { deleteDiscussionEverywhere } from "../worker/repositories/admin-discussion-mutations";
import type { ResearchBatch } from "@/domain";

let database: TestD1;

async function setupDatabase() {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
}

function batch(sourceId = "source-kimi-news", batchId = "batch-integration-1"): ResearchBatch {
  return {
    schemaVersion: "1",
    batchId,
    createdAt: "2026-08-11T20:00:00Z",
    agent: "codex/test",
    scope: "integration",
    observations: [{
      sourceId,
      sourceItemId: "20260811_01",
      canonicalUrl: "https://www.kimishinu-anime.com/news/20260811_01.html",
      title: "公式公开新角色视觉",
      excerpt: "公式网站公开新角色视觉。",
      publishedAt: "2026-08-11T12:00:00+09:00",
      candidates: [{
        animeId: "anime-kimishinu",
        contentClass: "official_news",
        sourceIdentity: "official",
        title: "公式公开新角色视觉",
        summary: "公式网站公开新角色视觉。",
        url: "https://www.kimishinu-anime.com/news/20260811_01.html",
        sourceName: "动画公式 NEWS",
        importance: 3,
        publishedAt: "2026-08-11T12:00:00+09:00",
        presentationMode: "link_only",
        safetyRating: "safe",
        spoilerLevel: "none",
        confidence: 0.95,
        review: { decision: "publish", confidence: 0.95, reasons: ["公式来源"] },
      }],
    }],
  };
}

beforeEach(setupDatabase);
afterEach(() => database.close());

describe("local research batch", () => {
  test("publishes a safe official candidate and is idempotent by batch ID", async () => {
    await rememberSearch(database.binding(), [{
      scopeType: "source",
      scopeId: "source-kimi-news",
      searchKind: "registered_source",
      targetKey: "https://www.kimishinu-anime.com/news/",
      queryText: "https://www.kimishinu-anime.com/news/",
      status: "active",
      cursor: {},
      lastResultHash: "fixture",
      lastResultCount: 1,
      usefulResultCount: 0,
      searchedAt: "2026-08-11T20:00:00Z",
      hits: [{
        canonicalUrl: "https://www.kimishinu-anime.com/news/20260811_01.html",
        title: "fixture",
        contentHash: "fixture",
        outcome: "seen",
      }],
    }]);
    const first = await ingestResearchBatch(database.binding(), batch() as never);
    expect(first).toMatchObject({ duplicate: false, observations: 1, candidates: 1, published: 1, held: 0 });
    const second = await ingestResearchBatch(database.binding(), batch() as never);
    expect(second.duplicate).toBe(true);
    const counts = database.sqlite.query(`
      SELECT
        (SELECT COUNT(*) FROM source_observations WHERE source_item_id = '20260811_01') AS observations,
        (SELECT COUNT(*) FROM feed_candidates WHERE discovered_by = 'local_skill') AS candidates,
        (SELECT COUNT(*) FROM feed_items WHERE auto_published = 1) AS published
    `).get() as { observations: number; candidates: number; published: number };
    expect(counts).toEqual({ observations: 1, candidates: 1, published: 1 });
    expect(database.sqlite.query(`
      SELECT outcome, observation_id IS NOT NULL AS has_observation,
        candidate_id IS NOT NULL AS has_candidate
      FROM search_memory_hits
    `).get()).toEqual({ outcome: "published", has_observation: 1, has_candidate: 1 });
  });

  test("downgrades community auto-publish to hold", async () => {
    const value = batch("source-kimi-bgm", "batch-community-1");
    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result).toMatchObject({ published: 0, held: 1 });
    const decision = database.sqlite.query(`
      SELECT decision, reviewer_type FROM review_decisions ORDER BY created_at DESC LIMIT 1
    `).get() as { decision: string; reviewer_type: string };
    expect(decision).toEqual({ decision: "hold", reviewer_type: "local_skill" });
  });

  test("auto-publishes a deterministic popular link-only community thread", async () => {
    const value = batch("source-kimi-bgm", "batch-community-popular-1");
    value.observations[0].sourceItemId = "574837";
    value.observations[0].canonicalUrl = "https://bbs.yamibo.com/thread-574837-1-1.html";
    value.observations[0].metadata = {
      originalOpened: true,
      bodyCopied: false,
      repliesObserved: 19,
      viewsObserved: 503,
    };
    value.observations[0].candidates[0] = {
      ...value.observations[0].candidates[0],
      platformObjectId: "574837",
      contentClass: "community_thread",
      sourceIdentity: "community",
      title: "百合会热门作品讨论",
      summary: "已打开原帖并核对作品关联的活跃讨论入口。",
      url: value.observations[0].canonicalUrl,
      sourceName: "百合会动漫区",
      presentationMode: "link_only",
      safetyRating: "safe",
      spoilerLevel: "mild",
      confidence: 0.97,
      review: { decision: "publish", confidence: 0.97, reasons: ["原帖、关联和热度均已确定"] },
    };

    const oldHeldValue = structuredClone(value);
    oldHeldValue.batchId = "batch-community-popular-old-held";
    oldHeldValue.observations[0].metadata = { originalOpened: false, bodyCopied: false };
    oldHeldValue.observations[0].candidates[0].safetyRating = "unknown";
    oldHeldValue.observations[0].candidates[0].review = {
      decision: "hold", confidence: 0.9, reasons: ["旧规则等待人工复核"],
    };
    expect(await ingestResearchBatch(database.binding(), oldHeldValue as never))
      .toMatchObject({ published: 0, held: 1 });

    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result).toMatchObject({ published: 1, held: 0 });
    expect((await readDiscussions(database.binding(), "anime-kimishinu"))
      .some((item) => item.url === value.observations[0].canonicalUrl)).toBe(true);
    expect(database.sqlite.query(`
      SELECT safety_rating, spoiler_level, status FROM feed_candidates WHERE url = ?
    `).get(value.observations[0].canonicalUrl)).toEqual({
      safety_rating: "safe", spoiler_level: "mild", status: "published",
    });
  });

  test("shows review context and policy reasons on the Admin dashboard", async () => {
    const value = batch("source-kimi-bgm", "batch-admin-review-context");
    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result.held).toBe(1);

    const dashboard = await readAdminDashboard(database.binding());
    expect(dashboard.heldCandidates[0]).toMatchObject({
      animeTitle: "与你相恋到生命尽头",
      evidenceCount: 1,
    });
    expect(dashboard.heldCandidates[0].reviewReasons)
      .toContain("社区与未验证来源需要人工复核");
  });

  test("remembers batch evidence that was not present in a registered-source crawl", async () => {
    const value = batch("source-kimi-news", "batch-memory-fallback-1");
    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result.published).toBe(1);

    expect(database.sqlite.query(`
      SELECT h.outcome, h.observation_id IS NOT NULL AS has_observation,
        h.candidate_id IS NOT NULL AS has_candidate, sm.search_kind
      FROM search_memory_hits h
      JOIN search_memory sm ON sm.id = h.memory_id
      WHERE h.canonical_url = ?
    `).get(value.observations[0].canonicalUrl)).toEqual({
      outcome: "published",
      has_observation: 1,
      has_candidate: 1,
      search_kind: "official_news",
    });
  });

  test("retries a failed batch instead of treating it as a completed duplicate", async () => {
    const failed = batch("source-does-not-exist", "batch-retry-1");
    await expect(ingestResearchBatch(database.binding(), failed as never)).rejects.toThrow();

    const failedRun = database.sqlite.query(`
      SELECT id, status FROM research_runs WHERE external_batch_id = 'batch-retry-1'
    `).get() as { id: string; status: string };
    expect(failedRun.status).toBe("failed");

    const retry = batch("source-kimi-news", "batch-retry-1");
    const result = await ingestResearchBatch(database.binding(), retry as never);
    expect(result).toMatchObject({ runId: failedRun.id, duplicate: false, published: 1 });

    const completedRun = database.sqlite.query(`
      SELECT status FROM research_runs WHERE id = ?
    `).get(failedRun.id) as { status: string };
    expect(completedRun.status).toBe("completed");
  });

  test("does not expose editorial observations as feed items", async () => {
    const value = batch("source-kimi-bgm", "batch-editorial-1");
    value.observations[0].candidates[0].contentClass = "editorial";
    value.observations[0].candidates[0].review.decision = "hold";

    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result).toMatchObject({ published: 0, held: 0, rejected: 1 });

    const candidate = database.sqlite.query(`
      SELECT id, status FROM feed_candidates WHERE discovered_by = 'local_skill'
    `).get() as { id: string; status: string };
    expect(candidate.status).toBe("rejected");
    expect(database.sqlite.query(`
      SELECT COUNT(*) AS count FROM feed_items WHERE candidate_id = ?
    `).get(candidate.id)).toEqual({ count: 0 });
  });

  test("registers and globally removes one community thread across all linked anime pages", async () => {
    const id = await createCandidate(database.binding(), {
      animeId: "anime-kimishinu",
      animeIds: ["anime-taiari", "anime-nanoha-exceeds", "anime-azurlane-bisoku-2"],
      contentClass: "community_thread",
      sourceIdentity: "community",
      title: "集中讨论串",
      summary: "长期讨论入口。",
      url: "https://bbs.example.test/thread-1",
      sourceName: "百合会",
      importance: 2,
      publishedAt: "2026-08-11T12:00:00+09:00",
      presentationMode: "link_only",
      safetyRating: "safe",
      spoilerLevel: "none",
      confidence: 0.9,
      discoveredBy: "local_skill",
    });

    await applyCandidateDecision(database.binding(), id, "publish", { reviewerType: "admin" });

    const discussion = database.sqlite.query(`
      SELECT id, anime_id, platform, title, url FROM discussions WHERE url = ?
    `).get("https://bbs.example.test/thread-1") as {
      id: string;
      anime_id: string;
      platform: string;
      title: string;
      url: string;
    };
    expect(discussion).toEqual({
      id: expect.any(String),
      anime_id: "anime-kimishinu",
      platform: "百合会",
      title: "集中讨论串",
      url: "https://bbs.example.test/thread-1",
    });
    expect(database.sqlite.query(`
      SELECT COUNT(*) AS count FROM discussion_anime
      WHERE discussion_id = (SELECT id FROM discussions WHERE url = ?)
    `).get("https://bbs.example.test/thread-1")).toEqual({ count: 4 });

    const secondaryFeed = await readFeed(database.binding(), {
      animeId: "anime-azurlane-bisoku-2",
      contentClasses: ["community_thread"],
    });
    expect(secondaryFeed.items[0]).toMatchObject({
      id: expect.any(String),
      relatedAnime: expect.arrayContaining([
        expect.objectContaining({ id: "anime-kimishinu" }),
        expect.objectContaining({ id: "anime-azurlane-bisoku-2" }),
      ]),
    });
    expect(database.sqlite.query(`
      SELECT discussion_id FROM feed_items WHERE candidate_id = ?
    `).get(id)).toEqual({ discussion_id: discussion.id });

    database.sqlite.query(`
      UPDATE discussions SET title = ?, url = ? WHERE id = ?
    `).run("更新后的集中讨论串", "https://bbs.example.test/thread-1-updated", discussion.id);
    expect((await readFeed(database.binding(), {
      animeId: "anime-azurlane-bisoku-2",
      contentClasses: ["community_thread"],
    })).items[0]).toMatchObject({
      title: "更新后的集中讨论串",
      url: "https://bbs.example.test/thread-1-updated",
    });

    await deleteDiscussionEverywhere(database.binding(), discussion.id, "不再收录这个讨论串");

    expect((await readFeed(database.binding(), {
      animeId: "anime-azurlane-bisoku-2",
      contentClasses: ["community_thread"],
    })).items).toHaveLength(0);
    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM discussions WHERE id = ?")
      .get(discussion.id)).toEqual({ count: 0 });
    expect(database.sqlite.query(`
      SELECT correction_type, reason FROM corrections
      WHERE feed_item_id = (SELECT id FROM feed_items WHERE candidate_id = ?)
    `).get(id)).toEqual({ correction_type: "withdraw", reason: "不再收录这个讨论串" });
    expect(database.sqlite.query(`
      SELECT action FROM audit_log WHERE entity_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(discussion.id)).toEqual({ action: "delete_discussion" });
  });

  test("writes high-confidence official theme songs and preserves jacket provenance", async () => {
    const value = batch("source-kimi-news", "batch-theme-song-1");
    value.observations[0].candidates = [];
    Object.assign(value.observations[0], {
      themeSongs: [{
        animeId: "anime-kimishinu",
        songKind: "theme",
        sequence: 1,
        title: "Official Opening",
        artist: "Artist Unit",
        lyricist: "Lyricist",
        composer: "Composer",
        arranger: null,
        episodeRange: null,
        officialUrl: "https://music.example.test/opening",
        coverUrl: "https://music.example.test/opening.jpg",
        coverSourceUrl: "https://music.example.test/opening",
        sortOrder: 0,
        review: { decision: "publish", confidence: 0.96, reasons: ["official source"] },
      }],
    });
    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result.resources).toBe(1);
    expect(database.sqlite.query(`
      SELECT mt.title, mt.cover_url, mt.source_url, mt.verified, ats.song_kind
      FROM music_tracks mt JOIN anime_theme_songs ats ON ats.track_id = mt.id
      WHERE ats.anime_id = 'anime-kimishinu'
    `).get()).toEqual({
      title: "Official Opening",
      cover_url: "https://music.example.test/opening.jpg",
      source_url: value.observations[0].canonicalUrl,
      verified: 1,
      song_kind: "theme",
    });
  });

  test("does not overwrite a conflicting theme-song slot", async () => {
    const first = batch("source-kimi-news", "batch-theme-conflict-base");
    first.observations[0].candidates = [];
    Object.assign(first.observations[0], { themeSongs: [{
      animeId: "anime-kimishinu", songKind: "opening", sequence: 1,
      title: "First Song", artist: "Artist", lyricist: null, composer: null,
      arranger: null, episodeRange: null, officialUrl: null, coverUrl: null,
      coverSourceUrl: null, sortOrder: 0,
      review: { decision: "publish", confidence: 0.96, reasons: ["official source"] },
    }] });
    await ingestResearchBatch(database.binding(), first as never);
    const conflict = structuredClone(first);
    conflict.batchId = "batch-theme-conflict-new";
    conflict.observations[0].sourceItemId = "theme-conflict-new";
    const conflictObservation = conflict.observations[0] as typeof conflict.observations[0] & {
      themeSongs: Array<{ title: string }>;
    };
    conflictObservation.themeSongs[0].title = "Different Song";
    await expect(ingestResearchBatch(database.binding(), conflict as never)).rejects.toMatchObject({ status: 409 });
    expect(database.sqlite.query("SELECT title FROM music_tracks").get()).toEqual({ title: "First Song" });
  });

  test("publishes a verified cast post with the full work-person-account chain", async () => {
    const value = {
      schemaVersion: "1",
      batchId: "batch-cast-post-1",
      createdAt: "2026-08-11T20:00:00Z",
      agent: "codex/test",
      scope: "cast social",
      observations: [{
        accountId: "account-rie-x",
        sourceItemId: "x:1955000000000000001",
        canonicalUrl: "https://x.com/taka8rie/status/1955000000000000001",
        excerpt: "高橋李依提到《与你相恋到生命尽头》与希娜。",
        authorName: "高橋李依",
        publishedAt: "2026-08-11T12:00:00+09:00",
        candidates: [{
          animeId: "anime-kimishinu",
          personId: "person-takahashi-rie",
          characterId: "char-sheena",
          accountId: "account-rie-x",
          platformObjectId: "x:1955000000000000001",
          contentClass: "cast_post",
          sourceIdentity: "creator",
          title: "高桥李依谈及希娜",
          summary: "高桥李依发布与本作角色希娜直接相关的动态。",
          url: "https://x.com/taka8rie/status/1955000000000000001",
          sourceName: "ignored client label",
          publishedAt: "2026-08-11T12:00:00+09:00",
          presentationMode: "link_only",
          safetyRating: "safe",
          spoilerLevel: "none",
          confidence: 0.96,
          review: { decision: "publish", confidence: 0.96, reasons: ["已验证声优账号", "明确提到本作角色"] },
        }],
      }],
    };

    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result).toMatchObject({ published: 1, held: 0 });
    expect(database.sqlite.query(`
      SELECT source_identity, anime_id, person_id, character_id, account_id,
        platform_object_id, origin_key, source_account
      FROM feed_items WHERE url = 'https://x.com/taka8rie/status/1955000000000000001'
    `).get()).toEqual({
      source_identity: "cast",
      anime_id: "anime-kimishinu",
      person_id: "person-takahashi-rie",
      character_id: "char-sheena",
      account_id: "account-rie-x",
      platform_object_id: "x:1955000000000000001",
      origin_key: "cast:anime-kimishinu:account-rie-x:x:1955000000000000001",
      source_account: "@taka8rie",
    });
    expect(database.sqlite.query(`
      SELECT enabled, source_type, account_id FROM research_sources
      WHERE account_id = 'account-rie-x' AND source_type = 'social'
    `).get()).toEqual({ enabled: 0, source_type: "social", account_id: "account-rie-x" });
  });

  test("rejects a cast post when the verified account owner is not cast in the work", async () => {
    const value = {
      schemaVersion: "1", batchId: "batch-cast-mismatch", createdAt: "2026-08-11T20:00:00Z",
      agent: "codex/test", scope: "cast mismatch", observations: [{
        accountId: "account-aono-x", sourceItemId: "x:1955000000000000002",
        canonicalUrl: "https://x.com/aooont/status/1955000000000000002",
        excerpt: "测试", candidates: [{
          animeId: "anime-kimishinu", personId: "person-aono-nachi", accountId: "account-aono-x",
          platformObjectId: "x:1955000000000000002", contentClass: "cast_post", sourceIdentity: "cast",
          title: "错误声优关系", summary: "错误关系。",
          url: "https://x.com/aooont/status/1955000000000000002", sourceName: "测试",
          publishedAt: "2026-08-11T12:00:00+09:00", safetyRating: "safe", spoilerLevel: "none",
          review: { decision: "publish", confidence: 0.96, reasons: ["test"] },
        }],
      }],
    };
    await expect(ingestResearchBatch(database.binding(), value as never))
      .rejects.toThrow("没有命中本作的角色—声优关系");
  });

  test("always holds original fanwork and stores only link-only media", async () => {
    const value = {
      schemaVersion: "1", batchId: "batch-fanwork-1", createdAt: "2026-08-11T20:00:00Z",
      agent: "codex/test", scope: "fanwork", observations: [{
        source: {
          sourceType: "social", label: "画师 X", url: "https://x.com/example_artist",
          trustLevel: "community",
        },
        sourceItemId: "x:1955000000000000003",
        canonicalUrl: "https://x.com/example_artist/status/1955000000000000003",
        excerpt: "作者发布《与你相恋到生命尽头》同人图。",
        authorName: "Example Artist",
        publishedAt: "2026-08-11T12:00:00+09:00",
        candidates: [{
          animeId: "anime-kimishinu", characterId: "char-sheena",
          platformObjectId: "x:1955000000000000003", contentClass: "fanwork",
          sourceIdentity: "creator", title: "希娜同人插画", summary: "原作者发布的本作同人插画。",
          url: "https://x.com/example_artist/status/1955000000000000003", sourceName: "Example Artist",
          publishedAt: "2026-08-11T12:00:00+09:00", presentationMode: "link_only",
          safetyRating: "safe", spoilerLevel: "none", confidence: 0.98,
          media: {
            contentClass: "fanart", title: "希娜同人插画", creatorName: "Example Artist",
            creatorUrl: "https://x.com/example_artist",
            originalUrl: "https://x.com/example_artist/status/1955000000000000003",
            presentationMode: "remote_preview", safetyRating: "safe", spoilerLevel: "none",
            rightsNote: "原帖外链",
          },
          review: { decision: "publish", confidence: 0.98, reasons: ["原作者原帖"] },
        }],
      }],
    };
    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result).toMatchObject({ published: 0, held: 1 });
    expect(database.sqlite.query(`
      SELECT fc.status, fc.source_identity, fc.origin_key, m.presentation_mode, m.original_url
      FROM feed_candidates fc JOIN media_items m ON m.id = fc.media_id
      WHERE fc.content_class = 'fanwork'
    `).get()).toMatchObject({
      status: "held",
      source_identity: "community",
      presentation_mode: "link_only",
      original_url: "https://x.com/example_artist/status/1955000000000000003",
    });
  });

  test("imports discovered cast accounts as unverified account claims", async () => {
    const value = batch("source-kimi-news", "batch-account-discovery-1");
    value.observations[0].candidates = [];
    Object.assign(value.observations[0], {
      accountDiscoveries: [{
        animeId: "anime-kimishinu", personId: "person-seto-asami", platform: "Instagram",
        handle: "@seto_asami", url: "https://www.instagram.com/seto_asami/",
        verificationSourceUrl: value.observations[0].canonicalUrl,
        review: { decision: "publish", confidence: 0.97, reasons: ["公式页交叉链接"] },
      }],
    });
    const result = await ingestResearchBatch(database.binding(), value as never);
    expect(result.resources).toBe(1);
    expect(database.sqlite.query(`
      SELECT verified, monitor_mode, verification_source_url FROM accounts
      WHERE owner_id = 'person-seto-asami' AND platform = 'Instagram'
    `).get()).toEqual({
      verified: 0,
      monitor_mode: "local",
      verification_source_url: value.observations[0].canonicalUrl,
    });
    expect(database.sqlite.query(`
      SELECT predicate, status, subject_type FROM claims WHERE predicate = 'account_identity'
    `).get()).toEqual({ predicate: "account_identity", status: "proposed", subject_type: "account" });
  });

  test("withdraws a published item with a correction and audit record", async () => {
    const id = await createCandidate(database.binding(), {
      animeId: "anime-kimishinu",
      contentClass: "official_news",
      sourceIdentity: "official",
      title: "撤回测试",
      summary: "测试动态。",
      url: "https://example.com/withdraw-test",
      sourceName: "动画公式",
      publishedAt: "2026-08-11T12:00:00+09:00",
      confidence: 1,
    });

    await applyCandidateDecision(database.binding(), id, "publish", { reviewerType: "admin" });
    await applyCandidateDecision(database.binding(), id, "withdraw", {
      reviewerType: "admin",
      reasons: ["内容关联错误"],
    });

    expect(database.sqlite.query(`
      SELECT withdrawn_at IS NOT NULL AS withdrawn FROM feed_items WHERE candidate_id = ?
    `).get(id)).toEqual({ withdrawn: 1 });
    expect(database.sqlite.query(`
      SELECT correction_type, reason, actor_type FROM corrections
      WHERE feed_item_id = (SELECT id FROM feed_items WHERE candidate_id = ?)
    `).get(id)).toEqual({ correction_type: "withdraw", reason: "内容关联错误", actor_type: "admin" });
    expect(database.sqlite.query(`
      SELECT action FROM audit_log WHERE entity_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(id)).toEqual({ action: "review_candidate" });
  });

  test("only exposes candidate projections while their publication is active", async () => {
    const mediaCandidateId = await createCandidate(database.binding(), {
      animeId: "anime-kimishinu",
      contentClass: "official_art",
      sourceIdentity: "official",
      title: "Rejected visual",
      summary: "This visual must disappear after rejection.",
      url: "https://example.com/rejected-visual",
      sourceName: "Official site",
      publishedAt: "2026-08-11T12:00:00+09:00",
      presentationMode: "link_only",
      safetyRating: "safe",
      spoilerLevel: "none",
      confidence: 1,
      media: {
        contentClass: "official_art",
        title: "Rejected visual",
        creatorName: "Official site",
        originalUrl: "https://example.com/rejected-visual",
        presentationMode: "link_only",
        safetyRating: "safe",
        spoilerLevel: "none",
      },
    });
    const discussionCandidateId = await createCandidate(database.binding(), {
      animeId: "anime-kimishinu",
      contentClass: "community_thread",
      sourceIdentity: "community",
      title: "Rejected discussion",
      summary: "This discussion must disappear after rejection.",
      url: "https://example.com/rejected-discussion",
      sourceName: "Community",
      publishedAt: "2026-08-11T12:00:00+09:00",
      presentationMode: "link_only",
      safetyRating: "safe",
      spoilerLevel: "none",
      confidence: 1,
    });

    expect((await readFeed(database.binding())).items.some((item) =>
      item.url === "https://example.com/rejected-visual"
      || item.url === "https://example.com/rejected-discussion")).toBe(false);
    expect((await readMedia(database.binding(), "anime-kimishinu")).some(
      (item) => item.originalUrl === "https://example.com/rejected-visual",
    )).toBe(false);
    expect((await readDiscussions(database.binding(), "anime-kimishinu")).some(
      (item) => item.url === "https://example.com/rejected-discussion",
    )).toBe(false);

    await applyCandidateDecision(database.binding(), mediaCandidateId, "publish", { reviewerType: "admin" });
    await applyCandidateDecision(database.binding(), discussionCandidateId, "publish", { reviewerType: "admin" });
    const publishedUrls = (await readFeed(database.binding())).items.map((item) => item.url);
    expect(publishedUrls).toContain("https://example.com/rejected-visual");
    expect(publishedUrls).toContain("https://example.com/rejected-discussion");
    expect((await readMedia(database.binding(), "anime-kimishinu")).map((item) => item.originalUrl))
      .toContain("https://example.com/rejected-visual");
    expect((await readDiscussions(database.binding(), "anime-kimishinu")).map((item) => item.url))
      .toContain("https://example.com/rejected-discussion");

    await expect(applyCandidateDecision(database.binding(), mediaCandidateId, "reject", { reviewerType: "admin" }))
      .rejects.toThrow("已发布动态不能改为暂存或拒绝");
    await applyCandidateDecision(database.binding(), mediaCandidateId, "withdraw", {
      reviewerType: "admin",
      reasons: ["测试撤回"],
    });
    await applyCandidateDecision(database.binding(), discussionCandidateId, "withdraw", {
      reviewerType: "admin",
      reasons: ["测试撤回"],
    });

    const feed = await readFeed(database.binding());
    expect(feed.items.some((item) => item.url === "https://example.com/rejected-visual")).toBe(false);
    expect(feed.items.some((item) => item.url === "https://example.com/rejected-discussion")).toBe(false);
    expect((await readMedia(database.binding(), "anime-kimishinu")).some(
      (item) => item.originalUrl === "https://example.com/rejected-visual",
    )).toBe(false);
    expect((await readDiscussions(database.binding(), "anime-kimishinu")).some(
      (item) => item.url === "https://example.com/rejected-discussion",
    )).toBe(false);

    const dashboard = await readAdminDashboard(database.binding());
    expect(dashboard.recentPublications.some((item) =>
      item.candidateId === mediaCandidateId || item.candidateId === discussionCandidateId)).toBe(false);
  });
});
