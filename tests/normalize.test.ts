import { describe, expect, test } from "bun:test";
import { normalizeSource } from "~/research/connectors/normalize";
import type { SourceRecord } from "~/research/types";

const source: SourceRecord = {
  id: "source-test",
  animeId: "anime-test",
  animeTitle: "测试作品",
  sourceType: "rss",
  changeKind: "feed_candidate",
  label: "公式 NEWS",
  url: "https://example.com/news/",
  itemUrlTemplate: null,
  trustLevel: "official",
  cadenceProfile: "local",
  pollIntervalMin: 720,
  etag: null,
  lastModified: null,
  cursor: null,
};

describe("source normalization", () => {
  test("extracts same-page official news articles before unrelated links", async () => {
    const source = {
      id: "official", animeId: "anime", animeTitle: "作品", sourceType: "official_page",
      changeKind: "feed_candidate" as const, label: "公式 NEWS", url: "https://example.com/news/",
      itemUrlTemplate: null, trustLevel: "official" as const, cadenceProfile: "local" as const,
      pollIntervalMin: 720, etag: null, lastModified: null, cursor: null,
    };
    const raw = `<main><article id="news-2"><div><time>2026.08.07</time><h3>新视觉公开</h3></div><p>公式公开第二弹主视觉。</p><a href="https://shop.example.com/item">购买</a></article></main>`;
    const items = await normalizeSource(raw, "text/html", source);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "新视觉公开",
      publishedAt: "2026.08.07",
      canonicalUrl: "https://example.com/news/#news-2",
      metadata: { normalization: "html-article" },
    });
  });
  test("extracts stable RSS entries", async () => {
    const items = await normalizeSource(`<?xml version="1.0"?><rss><channel><item>
      <guid>news-42</guid><title><![CDATA[ 新视觉公开 ]]></title>
      <link>https://example.com/news/42</link><description>公式公开了新视觉。</description>
      <pubDate>Tue, 11 Aug 2026 12:00:00 GMT</pubDate>
    </item></channel></rss>`, "application/rss+xml", source);
    expect(items).toHaveLength(1);
    expect(items[0].sourceItemId).toBe("news-42");
    expect(items[0].canonicalUrl).toBe("https://example.com/news/42");
    expect(items[0].title).toBe("新视觉公开");
  });

  test("keeps only news-like HTML links and deduplicates URLs", async () => {
    const items = await normalizeSource(`
      <nav><a href="/about">About us</a></nav>
      <a href="/news/20260811">新角色与声优公开</a>
      <a href="/news/20260811">新角色与声优公开</a>
    `, "text/html", source);
    expect(items).toHaveLength(1);
    expect(items[0].canonicalUrl).toBe("https://example.com/news/20260811");
  });

  test("extracts a leading publication date from news link titles", async () => {
    const items = await normalizeSource(`
      <a href="/news/detail.php?id=1135231">2026.08.06 第1～3話を期間限定無料配信</a>
    `, "text/html", source);

    expect(items[0]).toMatchObject({
      title: "第1～3話を期間限定無料配信",
      publishedAt: "2026-08-06",
      excerpt: "第1～3話を期間限定無料配信",
    });
  });

  test("drops a generic NEWS navigation link", async () => {
    const items = await normalizeSource(`
      <a href="/news/">NEWS</a>
      <a href="/news/detail.php?id=1135231">2026.08.06 第1～3話を期間限定無料配信</a>
    `, "text/html", source);

    expect(items).toHaveLength(1);
    expect(items[0].canonicalUrl).toContain("id=1135231");
  });

  test("normalizes a community thread instead of action links", async () => {
    const communitySource = {
      ...source,
      sourceType: "community",
      url: "https://bbs.yamibo.com/thread-573280-1-1.html",
      trustLevel: "community" as const,
    };
    const html = `
      <title>错误的页面标题 - 动漫区 - 百合会 - Powered by Discuz!</title>
      <link href="https://bbs.yamibo.com/thread-573280-1-1.html" rel="canonical" />
      <span id="thread_subject">向日葵马戏团集中讨论</span>
      <span class="xg1">查看:</span> <span class="xi1">3492</span>
      <span class="xg1">回复:</span> <span class="xi1">30</span>
      <em id="authorposton41575986">发表于 2026-7-5 11:49</em>
      <em id="authorposton41576018">发表于 2026-7-5 12:51</em>
      <a href="home.php?mod=spacecp&amp;ac=favorite&amp;id=573280&amp;formhash=secret">收藏 18</a>
    `;
    const items = await normalizeSource(html, "text/html", communitySource);
    expect(items).toHaveLength(1);
    expect(items[0].canonicalUrl).toBe("https://bbs.yamibo.com/thread-573280-1-1.html");
    expect(items[0].title).toBe("向日葵马戏团集中讨论");
    expect(items[0].metadata).toMatchObject({ normalization: "community-thread", replyCount: 30, viewCount: 3492, lastPostId: 41576018 });
    expect(items[0].excerpt).not.toContain("收藏");

    const viewOnlyChanged = await normalizeSource(html.replace("3492", "4000"), "text/html", communitySource);
    const replyChanged = await normalizeSource(html.replace("回复:</span> <span class=\"xi1\">30", "回复:</span> <span class=\"xi1\">31"), "text/html", communitySource);
    expect(viewOnlyChanged[0].contentHash).toBe(items[0].contentHash);
    expect(replyChanged[0].contentHash).not.toBe(items[0].contentHash);
  });

  test("maps official news JSON unique IDs to detail URLs", async () => {
    const jsonSource = {
      ...source,
      url: "https://example.com/news/newslist.json",
      itemUrlTemplate: "https://example.com/news/?id={id}",
      sourceType: "official_json",
    };
    const items = await normalizeSource(JSON.stringify([{
      uniqueId: "20260811_01",
      title: "新角色视觉公开",
      datetime: "2026-08-11T12:00:00+09:00",
      thumb: "20260811_01-t.jpg",
    }]), "application/json", jsonSource);
    expect(items[0].sourceItemId).toBe("20260811_01");
    expect(items[0].canonicalUrl).toBe("https://example.com/news/?id=20260811_01");
    expect(items[0].publishedAt).toBe("2026-08-11T12:00:00+09:00");
    expect(items[0].metadata).toMatchObject({
      previewUrl: "https://example.com/news/thumbnail/20260811_01-t.jpg",
    });
  });

  test("falls back to the item template when a direct link is blank", async () => {
    const jsonSource = {
      ...source,
      url: "https://example.test/news/newslist.json",
      itemUrlTemplate: "https://example.test/news/{id}.html",
      sourceType: "official_json",
    };
    const items = await normalizeSource(JSON.stringify([{
      uniqueId: "20260811_01",
      title: "活动决定",
      directLinkUrl: "",
    }]), "application/json", jsonSource);

    expect(items[0].canonicalUrl).toBe("https://example.test/news/20260811_01.html");
  });

  test("maps numeric official news IDs to detail URLs", async () => {
    const source = {
      id: "official-json", animeId: "anime", animeTitle: "作品", sourceType: "official_json",
      changeKind: "feed_candidate" as const, label: "公式 NEWS", url: "https://example.com/news.json",
      itemUrlTemplate: "https://example.com/news/{id}", trustLevel: "official" as const,
      cadenceProfile: "local" as const, pollIntervalMin: 720, etag: null, lastModified: null, cursor: null,
    };
    const items = await normalizeSource(JSON.stringify([{ uniqueId: 42, title: "活动决定" }]), "application/json", source);
    expect(items[0].canonicalUrl).toBe("https://example.com/news/42");
  });

  test("extracts nested CMS rows with millisecond timestamps", async () => {
    const jsonSource = { ...source, url: "https://example.com/api/news/list", sourceType: "official_json" };
    const items = await normalizeSource(JSON.stringify({ data: { rows: [{
      id: 4166,
      title: "第6话转发活动",
      content: "<p>公式活动详情</p>",
      publishTime: 1786262400567,
      link: "https://example.com/news/4166",
    }] } }), "application/json", jsonSource);
    expect(items).toHaveLength(1);
    expect(items[0].sourceItemId).toBe("4166");
    expect(items[0].canonicalUrl).toBe("https://example.com/news/4166");
    expect(items[0].publishedAt).toBe("2026-08-09T08:00:00.567Z");
  });

  test("extracts a named official news collection and builds detail URLs from record IDs", async () => {
    const source = {
      id: "official-news-api", animeId: "anime", animeTitle: "作品", sourceType: "official_json",
      changeKind: "feed_candidate" as const, label: "公式 NEWS", url: "https://example.com/api/site-data/init",
      itemUrlTemplate: "https://example.com/news/{id}/", trustLevel: "official" as const,
      cadenceProfile: "local" as const, pollIntervalMin: 720, etag: null, lastModified: null, cursor: null,
    };
    const items = await normalizeSource(JSON.stringify({ news: [{
      id: "20260809_879",
      title: "<ruby>新角色<rt>しん</rt></ruby>公开",
      body: "<p>公式公开了<strong>新角色</strong>。</p>",
      date: "2026-08-09T01:25:37+09:00",
      thumbnail: "https://example.com/media/879.jpg",
      status: "publish",
    }] }), "application/json", source);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceItemId: "20260809_879",
      canonicalUrl: "https://example.com/news/20260809_879/",
      title: "新角色 しん 公开",
      publishedAt: "2026-08-09T01:25:37+09:00",
      metadata: {
        normalization: "json-record",
        previewUrl: "https://example.com/media/879.jpg",
        publicText: "公式公开了 新角色 。",
      },
    });
    expect(items[0].excerpt).toContain("公式公开了 新角色 。");
    expect(items[0].excerpt).not.toContain("<strong>");
  });

  test("keeps complete official JSON archives that contain more than 60 entries", async () => {
    const archive = Array.from({ length: 73 }, (_, index) => ({
      uniqueId: `2025${String(index).padStart(4, "0")}`,
      title: `公式消息 ${index}`,
      date: "2025.03.17",
    }));
    const items = await normalizeSource(JSON.stringify(archive), "application/json", {
      ...source,
      sourceType: "official_json",
      itemUrlTemplate: "https://example.com/news/?id={id}",
    });

    expect(items).toHaveLength(73);
    expect(items.at(-1)?.canonicalUrl).toBe("https://example.com/news/?id=20250072");
  });

  test("drops a generic NEWS shell article before candidate extraction", async () => {
    const items = await normalizeSource(`
      <article><h2>NEWS</h2><p>NEWS</p></article>
      <article id="news-1"><time>2026.08.11</time><h3>新视觉公开</h3></article>
    `, "text/html", {
      ...source,
      sourceType: "official_page",
    });

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("新视觉公开");
  });

  test("ignores volatile Bangumi popularity metrics but keeps catalog changes", async () => {
    const bangumiSource = { ...source, sourceType: "bangumi", url: "https://api.bgm.tv/v0/subjects/42" };
    const base = {
      id: 42,
      name: "作品",
      summary: "简介",
      infobox: [{ key: "话数", value: "12" }],
      rating: { score: 7.1, total: 100 },
      collection: { doing: 500 },
    };
    const first = await normalizeSource(JSON.stringify(base), "application/json", bangumiSource);
    const popularityChanged = await normalizeSource(JSON.stringify({
      ...base,
      rating: { score: 7.2, total: 105 },
      collection: { doing: 520 },
    }), "application/json", bangumiSource);
    const catalogChanged = await normalizeSource(JSON.stringify({
      ...base,
      infobox: [{ key: "话数", value: "13" }],
    }), "application/json", bangumiSource);
    expect(popularityChanged[0].contentHash).toBe(first[0].contentHash);
    expect(catalogChanged[0].contentHash).not.toBe(first[0].contentHash);
  });
});
