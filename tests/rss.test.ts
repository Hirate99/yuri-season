import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseDocument, DomUtils } from "htmlparser2";
import { rssRoutes } from "~/http/rss";
import { readSubscriptionFeed } from "~/repositories/feed";
import { subscriptionPath } from "@/lib/feed-search";
import { TestD1 } from "./support/d1-adapter";

describe("public RSS", () => {
  let db: TestD1;
  let base: Record<string, string | number | null>;
  beforeEach(async () => {
    db = new TestD1();
    for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort())
      db.exec(await Bun.file(path).text());
    base = db.sqlite
      .query("SELECT * FROM feed_items WHERE anime_id = 'anime-kimishinu' LIMIT 1")
      .get() as typeof base;
    db.exec("DELETE FROM publication_documents; DELETE FROM feed_items;");
  });
  afterEach(() => db.close());

  function item(id: string, values: Record<string, string | number | null> = {}) {
    const row = {
      ...base,
      id,
      candidate_id: null,
      media_id: null,
      discussion_id: null,
      title: "新情报",
      summary: "中文摘要",
      content_class: "official_news",
      safety_rating: "safe",
      withdrawn_at: null,
      is_pinned: 0,
      published_at: "2026-08-01T00:00:00Z",
      created_at: "2026-09-15 12:00:00",
      ...values,
    };
    db.sqlite
      .query(
        `INSERT INTO feed_items (${Object.keys(row).join(",")}) VALUES (${Object.keys(row)
          .map(() => "?")
          .join(",")})`,
      )
      .run(...Object.values(row));
  }
  const get = (path = "/rss.xml", headers?: HeadersInit) =>
    rssRoutes.request(`https://preview.example${path}`, { headers }, { DB: db.binding() } as Env);
  function xmlText(xml: string, tag: string) {
    return DomUtils.findAll(
      (element) => element.name === tag,
      parseDocument(xml, { xmlMode: true }).children,
    ).map((element) => DomUtils.textContent(element));
  }

  test("includes backfilled publications before old pinned stories and keeps stable identity", async () => {
    item("old", {
      created_at: "2026-09-01 00:00:00",
      published_at: "2026-09-15T00:00:00Z",
      is_pinned: 1,
    });
    item("backfill");
    const response = await get();
    const xml = await response.text();
    expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    expect(xmlText(xml, "guid")).toEqual([
      "https://i-yuri.com/updates/backfill",
      "https://i-yuri.com/updates/old",
    ]);
    expect(xmlText(xml, "pubDate")[0]).toBe("Tue, 15 Sep 2026 12:00:00 GMT");
    expect(xmlText(xml, "content:encoded")[0]).toContain("2026-08-01T00:00:00.000Z");
    expect(xml).not.toContain("preview.example");
    db.sqlite.query("UPDATE feed_items SET title = '修订标题' WHERE id = 'backfill'").run();
    expect(xmlText(await (await get()).text(), "guid")).toEqual(xmlText(xml, "guid"));
  });

  test("serves safe full text and ordered preferred images without per-item queries", async () => {
    const media = db.sqlite.query("SELECT id FROM media_items LIMIT 1").get() as { id: string };
    db.sqlite
      .query(
        "UPDATE media_items SET presentation_mode='mirrored_with_permission', safety_rating='safe', creator_name='绘师' WHERE id=?",
      )
      .run(media.id);
    item("full", { media_id: media.id, title: "<新图> & 中文 ]]>\u0001", spoiler_level: "major" });
    for (let i = 0; i < 85; i++) item(`other-${i}`, { created_at: "2026-09-01 00:00:00" });
    db.sqlite
      .query(
        "INSERT INTO publication_documents(feed_item_id,public_text,public_translation,text_mode,source_status,captured_at) VALUES (?,?,?,?,?,?)",
      )
      .run(
        "full",
        "日本語",
        "完整译文\n\n<script>alert(1)</script> & ]]>\u0001",
        "full_with_translation",
        "active",
        "2026-09-15T12:00:00Z",
      );
    db.sqlite.query("DELETE FROM media_assets WHERE media_id=?").run(media.id);
    const asset = db.sqlite.query(
      "INSERT INTO media_assets(id,media_id,r2_key,source_url,content_hash,mime_type,sort_order,variant,rights_status,status,alt_text) VALUES (?,?,?,?,?,'image/webp',?,?,?,'active',?)",
    );
    for (const [id, sort, variant, rights] of [
      ["first-original", 0, "original", "licensed"],
      ["first-preview", 0, "preview", "licensed"],
      ["second", 1, "preview", "press_kit"],
      ["blocked", 2, "preview", "prohibited"],
    ] as const) {
      asset.run(
        id,
        media.id,
        `rss/${id}.webp`,
        `https://source.example/${sort}.jpg`,
        id,
        sort,
        variant,
        rights,
        `图${sort}`,
      );
    }
    db.resetMetrics();
    const xml = await (await get()).text();
    expect(db.executedStatements).toBe(3);
    expect(xmlText(xml, "item")).toHaveLength(80);
    expect(xmlText(xml, "title")[1]).toBe("【剧透】<新图> & 中文 ]]>");
    expect(xml).not.toContain("\u0001");
    const plan = db.sqlite.query(`EXPLAIN QUERY PLAN ${db.statements[0]}`).all(80);
    expect(JSON.stringify(plan)).not.toContain("TEMP B-TREE FOR ORDER BY");
    const html = xmlText(xml, "content:encoded")[0];
    expect(html).toContain("完整译文");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("\u0001");
    expect(html).toContain("first-preview.webp");
    expect(html).not.toContain("first-original.webp");
    expect(html).not.toContain("blocked.webp");
    expect(html.indexOf("first-preview.webp")).toBeLessThan(html.indexOf("second.webp"));
    expect(html).toContain("绘师");
    expect(html.indexOf("剧透提示")).toBeLessThan(html.indexOf("<img"));
  });

  test("respects text restrictions and labels cover fallback", async () => {
    item("restricted");
    db.sqlite
      .query("UPDATE anime SET cover_url='/covers/example.webp' WHERE id=?")
      .run(base.anime_id);
    const insert = db.sqlite.query(
      "INSERT INTO publication_documents(feed_item_id,public_text,public_translation,text_mode,source_status,captured_at) VALUES ('restricted','禁止全文','禁止译文',?,'active','2026-09-15T12:00:00Z')",
    );
    for (const mode of ["summary_only", "link_only", "withdrawn"]) {
      db.exec("DELETE FROM publication_documents");
      insert.run(mode);
      const html = xmlText(await (await get()).text(), "content:encoded")[0];
      expect(html).toContain("中文摘要");
      expect(html).not.toContain("禁止");
      expect(html).toContain("作品封面");
      expect(html).toContain("https://i-yuri.com/covers/example.webp");
    }
  });

  test("matches work/category/search filters and never exposes hidden content", async () => {
    item("matching", { title: "广播更新" });
    item("cast", { content_class: "cast_post" });
    item("other-work", { anime_id: "anime-nanoha-exceeds" });
    item("withdrawn", { withdrawn_at: "2026-09-15" });
    item("adult", { safety_rating: "adult" });
    item("editorial", { content_class: "editorial" });
    const xml = await (
      await get(subscriptionPath({ anime: "kimishinu", category: "official", q: "广播" }))
    ).text();
    expect(xmlText(xml, "guid")).toEqual(["https://i-yuri.com/updates/matching"]);
    expect(await readSubscriptionFeed(db.binding())).toHaveLength(3);
    expect((await get("/rss.xml?category=unknown")).status).toBe(400);
    expect(xmlText(await (await get("/rss.xml?anime=no-results")).text(), "item")).toHaveLength(0);
  });

  test("handles HEAD and conditional requests; revisions and withdrawals invalidate ETags", async () => {
    item("change");
    const response = await get();
    const tag = response.headers.get("etag")!;
    const cached = await get("/rss.xml", { "If-None-Match": `"other", W/${tag}` });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe("");
    db.sqlite.query("UPDATE feed_items SET summary='更正后的摘要' WHERE id='change'").run();
    const changed = await get("/rss.xml", { "If-None-Match": tag });
    expect(changed.status).toBe(200);
    expect(changed.headers.get("etag")).not.toBe(tag);
    db.sqlite.query("UPDATE feed_items SET withdrawn_at='2026-09-15' WHERE id='change'").run();
    expect((await get()).headers.get("etag")).not.toBe(changed.headers.get("etag"));
    const head = await rssRoutes.request("https://i-yuri.com/rss.xml", { method: "HEAD" }, {
      DB: db.binding(),
    } as Env);
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });
});
