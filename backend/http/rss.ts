import { Hono } from "hono";
import { etag } from "hono/etag";
import { html } from "hono/html";
import { Feed } from "feed";
import {
  feedClasses,
  feedFilters,
  subscriptionLabel,
  subscriptionPath,
  type FeedSearch,
} from "@/lib/feed-search";
import { pageUrl } from "@/lib/seo";
import { readSubscriptionFeed } from "~/repositories/feed";
import { cleanXml } from "~/shared/xml";

type SubscriptionPage = Awaited<ReturnType<typeof readSubscriptionFeed>>;
type Entry = SubscriptionPage["entries"][number];

function webUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, pageUrl("/"));
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function paragraphs(value: string) {
  return html`${value
    .split(/\n\s*\n/u)
    .filter(Boolean)
    .map(
      (part) =>
        html`<p style="margin:0 0 1em">
          ${part.split("\n").map((line, index) => html`${index ? html`<br />` : ""}${line}`)}
        </p>`,
    )}`;
}

function entryHtml({ item, document, assets }: Entry, detail: string): string {
  const source = webUrl(item.url);
  const full = document && ["full", "full_with_translation", "excerpt"].includes(document.textMode);
  const translation = full ? document.publicTranslation?.trim() : null;
  const original = full ? document.publicText?.trim() : null;
  const works = item.relatedAnime?.length
    ? item.relatedAnime
    : item.animeSlug && item.animeTitle
      ? [{ slug: item.animeSlug, title: item.animeTitle }]
      : [];
  const canShowMedia =
    item.media &&
    item.media.presentationMode !== "link_only" &&
    ["safe", "suggestive"].includes(item.media.safetyRating) &&
    document?.textMode !== "withdrawn";
  const images = canShowMedia
    ? assets.filter((asset) => asset.mimeType.startsWith("image/") && webUrl(asset.url))
    : [];
  const cover = !images.length ? webUrl(item.animeCoverUrl) : null;
  const image = (url: string, caption: string, isCover = false) =>
    html`<figure style="margin:24px 0">
      <a href="${detail}"
        ><img
          src="${url}"
          alt="${caption}"
          style="display:block;max-width:100%;height:auto;margin:0 auto;${isCover ? "max-height:360px" : ""}"
      /></a>
      <figcaption style="margin-top:8px;font-size:0.85em;line-height:1.5;text-align:center">
        ${caption}
      </figcaption>
    </figure>`;
  const figures = images.map((asset) =>
    image(
      asset.url,
      [asset.altText || item.title, item.media?.creatorName].filter(Boolean).join(" · "),
    ),
  );
  if (cover) figures.push(image(cover, `${item.animeTitle ?? "关联作品"} · 作品封面`, true));
  const spoiler =
    item.spoilerLevel !== "none" || (item.media && item.media.spoilerLevel !== "none");
  return String(html`
    <article style="max-width:720px;margin:0 auto;line-height:1.8;overflow-wrap:anywhere">
      ${spoiler && html`<p><strong>剧透提示：下文及图片涉及剧情。</strong></p>`}
      ${paragraphs(item.summary)} ${figures[0]}
      ${
        translation &&
        translation !== item.summary.trim() &&
        html`
          <h2 style="margin:32px 0 16px;font-size:1.15em">
            中文翻译${document?.textMode === "excerpt" ? "（节选）" : ""}
          </h2>
          ${paragraphs(translation)}
        `
      }
      ${
        original &&
        original !== translation &&
        original !== item.summary.trim() &&
        html`
          <h2 style="margin:32px 0 16px;font-size:1.15em">
            ${document?.textMode === "excerpt" ? "原文节选" : "来源原文"}
          </h2>
          ${paragraphs(original)}
        `
      }
      ${figures.slice(1)}
      <hr style="margin:32px 0 20px;border:0;border-top:1px solid #dddddd" />
      <p>
        <strong>${document?.authorName || item.sourceName}</strong>
        ${document?.authorName && document.authorName !== item.sourceName && html` · ${item.sourceName}`}<br />
        原消息时间：<time datetime="${item.publishedAt}"
          >${new Date(item.publishedAt).toISOString().slice(0, 16).replace("T", " ")} UTC</time
        >
      </p>
      ${document?.sourceTitle && html`<p>原始标题：${document.sourceTitle}</p>`}
      ${works.length > 0 && html`<p>相关作品：${works.map((work, index) => html`${index ? " · " : ""}<a href="${pageUrl(`/anime/${encodeURIComponent(work.slug)}`)}">${work.title}</a>`)}</p>`}
      ${item.media?.rightsNote && html`<p style="font-size:0.85em">${item.media.rightsNote}</p>`}
      <p>
        <a href="${detail}">查看百合季详情与图片</a
        >${source && html` · <a href="${source}">原始来源</a>`}
      </p>
    </article>
  `);
}

export function renderRss(
  { entries, nextCursor }: SubscriptionPage,
  search: FeedSearch,
  cursor?: string,
): string {
  const animeTitle =
    entries.find(({ item }) => item.animeSlug === search.anime)?.item.animeTitle ?? undefined;
  const label = subscriptionLabel(search, animeTitle);
  const first = pageUrl(subscriptionPath(search));
  const self = pageUrl(subscriptionPath(search, cursor));
  const feedPage = first.replace("/rss.xml", "/feed");
  const feed = new Feed({
    title: `百合季 · ${label}`,
    id: first,
    link: feedPage,
    description: `百合季图文情报订阅：${label}`,
    language: "zh-CN",
    ttl: 5,
    feedLinks: { rss: self },
    // Avoid a changing build timestamp invalidating otherwise identical responses.
    updated: new Date(entries[0]?.createdAt ?? 0),
    generator: false,
  });
  const links = [
    { rel: "self", href: self },
    { rel: "first", href: first },
    ...(nextCursor ? [{ rel: "next", href: pageUrl(subscriptionPath(search, nextCursor)) }] : []),
  ].map((link) => ({ _attributes: { ...link, type: "application/rss+xml" } }));
  // feed's extension replaces atom:link, so preserve self in the complete array.
  // xml-js supports repeated elements; feed's extension type only describes objects.
  feed.addExtension({ name: "atom:link", objects: links as unknown as Record<string, unknown> });
  for (const entry of entries) {
    const { item } = entry;
    const detail = pageUrl(`/updates/${encodeURIComponent(item.id)}`);
    feed.addItem({
      title: `${item.spoilerLevel !== "none" ? "【剧透】" : ""}${item.title}`,
      link: detail,
      date: new Date(entry.createdAt),
      description: String(paragraphs(item.summary)),
      content: entryHtml(entry, detail),
      category: [
        item.contentClass,
        ...(item.relatedAnime?.length
          ? item.relatedAnime.map((anime) => anime.title)
          : [item.animeTitle]),
      ]
        .filter((name): name is string => Boolean(name))
        .map((name) => ({ name })),
    });
  }
  return cleanXml(feed.rss2());
}

export const rssRoutes = new Hono<{ Bindings: Env }>().get(
  "/rss.xml",
  etag({ generateDigest: (body) => crypto.subtle.digest("SHA-256", body) }),
  async (context) => {
    const search: FeedSearch = {};
    for (const key of ["anime", "category", "q"] as const) {
      const value = context.req.query(key)?.trim();
      if (
        value &&
        (value.length > (key === "q" ? 120 : 100) ||
          (key === "category" && !feedFilters.some((filter) => filter.value === value)))
      ) {
        return context.text("订阅筛选参数无效。", 400);
      }
      if (value && !(key === "category" && value === "all")) search[key] = value;
    }
    const cursor = context.req.query("cursor");
    const page = await readSubscriptionFeed(context.env.DB, {
      animeSlug: search.anime,
      contentClasses: feedClasses(search),
      query: search.q,
      cursor,
    });
    const xml = renderRss(page, search, cursor);
    context.header("Content-Type", "application/rss+xml; charset=utf-8");
    context.header("Cache-Control", "public, max-age=300, must-revalidate");
    return context.body(xml);
  },
);
