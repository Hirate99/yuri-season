import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { readPublicationPage } from "~/application/public/service";
import { applyCandidateDecision } from "~/repositories/candidates/decisions";
import { createCandidate } from "~/repositories/candidates/write";
import { bangumiCoverUrl, publicMediaUrl } from "@/lib/media-url";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

async function publishedOfficialItem() {
  database.sqlite.query(`
    UPDATE research_sources
    SET public_text_mode = 'excerpt', max_public_characters = 12
    WHERE id = 'source-kimi-news'
  `).run();
  database.sqlite.query(`
    INSERT INTO source_observations (
      id, source_id, anime_id, canonical_url, source_item_id, title, excerpt,
      public_text, author_name, published_at, captured_at, connector_version,
      original_language, content_type, http_status, content_hash, metadata_json
    ) VALUES (?, 'source-kimi-news', 'anime-kimishinu', ?, ?, ?, ?, ?, ?, ?, ?,
      'test@1', 'ja', 'text/plain', 200, ?, '{}')
  `).run(
    "observation-publication-detail",
    "https://www.kimishinu-anime.com/news/detail-test",
    "detail-test",
    "公式ニュース原題",
    "官网公开了新的官方新闻。",
    "これは公開する公式ニュースの本文です。",
    "アニメ公式",
    "2026-08-13T12:00:00Z",
    "2026-08-13T12:05:00Z",
    "publication-detail-hash",
  );
  const candidateId = await createCandidate(database.binding(), {
    observationId: "observation-publication-detail",
    animeId: "anime-kimishinu",
    contentClass: "official_art",
    sourceIdentity: "official",
    title: "公式视觉更新",
    summary: "公式公开了新的宣传视觉。",
    url: "https://www.kimishinu-anime.com/news/detail-test",
    sourceName: "动画公式",
    publishedAt: "2026-08-13T12:00:00Z",
    presentationMode: "mirrored_with_permission",
    safetyRating: "safe",
    spoilerLevel: "none",
    confidence: 1,
    media: {
      contentClass: "official_art",
      title: "公式视觉更新",
      creatorName: "动画公式",
      originalUrl: "https://www.kimishinu-anime.com/news/detail-test#visual",
      presentationMode: "mirrored_with_permission",
      safetyRating: "safe",
      spoilerLevel: "none",
      rightsNote: "官方媒体素材",
    },
  });
  await applyCandidateDecision(database.binding(), candidateId, "publish", { reviewerType: "admin" });
  const publication = database.sqlite.query(
    "SELECT id, media_id FROM feed_items WHERE candidate_id = ?",
  ).get(candidateId) as { id: string; media_id: string };
  return { candidateId, ...publication };
}

describe("publication details", () => {
  test("purges mirrored text from legacy withdrawn publications", () => {
    const result = database.sqlite.query(`
      SELECT
        COUNT(*) AS withdrawn,
        COALESCE(SUM(public_text IS NOT NULL), 0) AS retained_text,
        COALESCE(SUM(text_mode <> 'withdrawn'), 0) AS incorrect_mode
      FROM publication_documents
      WHERE source_status = 'withdrawn'
    `).get() as { withdrawn: number; retained_text: number; incorrect_mode: number };

    expect(result.withdrawn).toBeGreaterThan(0);
    expect(result).toMatchObject({ retained_text: 0, incorrect_mode: 0 });
  });

  test("materializes the source policy into a stable public text snapshot", async () => {
    const publication = await publishedOfficialItem();
    const page = await readPublicationPage(database.binding(), publication.id);

    expect(page).toMatchObject({
      item: { id: publication.id, title: "公式视觉更新" },
      document: {
        sourceTitle: "公式ニュース原題",
        authorName: "アニメ公式",
        sourceLanguage: "ja",
        publicText: "これは公開する公式ニュー",
        textMode: "excerpt",
        sourceStatus: "active",
        capturedAt: "2026-08-13T12:05:00.000Z",
      },
      assets: [],
    });
  });

  test("returns zone-less SQLite capture timestamps as explicit UTC instants", async () => {
    const publication = await publishedOfficialItem();
    database.sqlite.query(`
      UPDATE publication_documents
      SET captured_at = '2026-08-14 06:48:00', last_verified_at = '2026-08-14 06:49:00'
      WHERE feed_item_id = ?
    `).run(publication.id);

    expect((await readPublicationPage(database.binding(), publication.id))?.document).toMatchObject({
      capturedAt: "2026-08-14T06:48:00.000Z",
      lastVerifiedAt: "2026-08-14T06:49:00.000Z",
    });
  });

  test("keeps a Chinese translation separate from the original text", async () => {
    const publication = await publishedOfficialItem();
    database.sqlite.query(`
      UPDATE research_sources
      SET public_text_mode = 'full_with_translation', max_public_characters = 6000
      WHERE id = 'source-kimi-news'
    `).run();
    database.sqlite.query(`
      UPDATE source_observations
      SET public_translation = '这是公开的官方新闻正文。'
      WHERE id = 'observation-publication-detail'
    `).run();
    await applyCandidateDecision(database.binding(), publication.candidateId, "publish", { reviewerType: "admin" });

    expect((await readPublicationPage(database.binding(), publication.id))?.document).toMatchObject({
      publicText: "これは公開する公式ニュースの本文です。",
      publicTranslation: "这是公开的官方新闻正文。",
      textMode: "full_with_translation",
    });
  });

  test("serves only approved R2 assets and builds their public URL from the key", async () => {
    const publication = await publishedOfficialItem();
    database.sqlite.query(`
      INSERT INTO media_assets (
        id, media_id, r2_key, source_url, content_hash, mime_type, width, height,
        byte_size, variant, alt_text, rights_status, rights_basis, status
      ) VALUES
        ('asset-public', ?, 'yuri/publications/情报图 640.webp', ?, 'asset-hash',
          'image/webp', 640, 360, 12000, 'preview', '公式视觉', 'press_kit', '官方媒体包', 'active'),
        ('asset-private', ?, 'yuri/publications/private.webp', ?, 'private-hash',
          'image/webp', 640, 360, 12000, 'preview', NULL, 'link_only', NULL, 'active')
    `).run(
      publication.media_id,
      "https://www.kimishinu-anime.com/news/detail-test#visual",
      publication.media_id,
      "https://www.kimishinu-anime.com/news/detail-test#private",
    );

    const page = await readPublicationPage(database.binding(), publication.id);
    expect(page?.assets).toEqual([expect.objectContaining({
      id: "asset-public",
      url: "https://r2.i-yuri.com/yuri/publications/%E6%83%85%E6%8A%A5%E5%9B%BE%20640.webp",
      rightsStatus: "press_kit",
    })]);
    expect(page?.item.media?.previewUrl).toBe(
      "https://r2.i-yuri.com/yuri/publications/%E6%83%85%E6%8A%A5%E5%9B%BE%20640.webp",
    );
  });

  test("returns multiple source images in editorial order and collapses size variants", async () => {
    const publication = await publishedOfficialItem();
    database.sqlite.query(`
      INSERT INTO media_assets (
        id, media_id, r2_key, source_url, content_hash, mime_type, width, height,
        byte_size, sort_order, variant, alt_text, rights_status, rights_basis, status
      ) VALUES
        ('asset-first-original', ?, 'yuri/publications/first.jpg', ?, 'first-original-hash',
          'image/jpeg', 2000, 2000, 50000, 0, 'original', '第一张原图', 'press_kit', '官方下载素材', 'active'),
        ('asset-first-preview', ?, 'yuri/publications/first.webp', ?, 'first-preview-hash',
          'image/webp', 1000, 1000, 20000, 0, 'preview', '第一张预览', 'press_kit', '官方下载素材', 'active'),
        ('asset-second-preview', ?, 'yuri/publications/second.webp', ?, 'second-preview-hash',
          'image/webp', 1000, 1000, 21000, 1, 'preview', '第二张预览', 'press_kit', '官方下载素材', 'active')
    `).run(
      publication.media_id,
      "https://source.test/first.jpg",
      publication.media_id,
      "https://source.test/first.jpg",
      publication.media_id,
      "https://source.test/second.jpg",
    );

    const page = await readPublicationPage(database.binding(), publication.id);
    expect(page?.assets.map((asset) => ({ id: asset.id, sortOrder: asset.sortOrder }))).toEqual([
      { id: "asset-first-preview", sortOrder: 0 },
      { id: "asset-second-preview", sortOrder: 1 },
    ]);
  });

  test("refreshes the public text snapshot when the same source item changes", async () => {
    const publication = await publishedOfficialItem();
    database.sqlite.query(`
      INSERT INTO source_observations (
        id, source_id, anime_id, canonical_url, source_item_id, title, excerpt,
        public_text, author_name, published_at, captured_at, connector_version,
        original_language, content_type, http_status, content_hash, metadata_json
      ) VALUES ('observation-publication-refresh', 'source-kimi-news', 'anime-kimishinu', ?,
        'detail-test', '公式ニュース原題', '官网更新了这条新闻。', '更新された公式ニュース本文です。', 'アニメ公式',
        '2026-08-13T12:00:00Z', '2026-08-13T13:05:00Z', 'test@1', 'ja',
        'text/plain', 200, 'publication-refresh-hash', '{}')
    `).run("https://www.kimishinu-anime.com/news/detail-test");
    const candidateId = await createCandidate(database.binding(), {
      observationId: "observation-publication-refresh",
      animeId: "anime-kimishinu",
      contentClass: "official_art",
      sourceIdentity: "official",
      title: "公式视觉更新",
      summary: "公式公开了新的宣传视觉。",
      url: "https://www.kimishinu-anime.com/news/detail-test",
      sourceName: "动画公式",
      publishedAt: "2026-08-13T12:00:00Z",
      safetyRating: "safe",
      spoilerLevel: "none",
      confidence: 1,
    });
    expect(candidateId).toBe(publication.candidateId);
    await applyCandidateDecision(database.binding(), candidateId, "publish", { reviewerType: "admin" });

    expect((await readPublicationPage(database.binding(), publication.id))?.document).toMatchObject({
      publicText: "更新された公式ニュース本",
      capturedAt: "2026-08-13T13:05:00.000Z",
    });
  });

  test("does not expose an evidence paraphrase as source text", async () => {
    const publication = await publishedOfficialItem();
    database.sqlite.query(`
      UPDATE source_observations
      SET public_text = NULL, public_translation = '不应单独公开的翻译'
      WHERE id = 'observation-publication-detail'
    `).run();
    await applyCandidateDecision(database.binding(), publication.candidateId, "publish", { reviewerType: "admin" });

    expect((await readPublicationPage(database.binding(), publication.id))?.document).toMatchObject({
      publicText: null,
      publicTranslation: null,
      textMode: "summary_only",
    });
  });

  test("withdraws the public snapshot together with its feed projection", async () => {
    const publication = await publishedOfficialItem();
    await applyCandidateDecision(database.binding(), publication.candidateId, "withdraw", {
      reviewerType: "admin",
      reasons: ["来源要求撤回"],
    });

    expect(await readPublicationPage(database.binding(), publication.id)).toBeNull();
    expect(database.sqlite.query(`
      SELECT text_mode, source_status, public_text, public_translation FROM publication_documents WHERE feed_item_id = ?
    `).get(publication.id)).toEqual({
      text_mode: "withdrawn",
      source_status: "withdrawn",
      public_text: null,
      public_translation: null,
    });
  });

  test("rejects unsafe object keys when constructing R2 URLs", () => {
    expect(publicMediaUrl("../private/file.webp")).toBeNull();
    expect(publicMediaUrl("yuri//file.webp")).toBeNull();
  });

  test("requests an existing smaller Bangumi cover for compact cards", () => {
    const cover = "https://lain.bgm.tv/r/400/pic/cover/l/b3/26/541285_CYBZc.jpg";
    expect(bangumiCoverUrl(cover, 100))
      .toBe("https://lain.bgm.tv/r/100/pic/cover/l/b3/26/541285_CYBZc.jpg");
    expect(bangumiCoverUrl("https://example.com/cover.jpg", 100))
      .toBe("https://example.com/cover.jpg");
    expect(bangumiCoverUrl(null, 100)).toBeNull();
  });
});
