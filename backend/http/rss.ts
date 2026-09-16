import { Hono } from "hono";
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
import { cleanXml, escapeXml } from "~/shared/xml";

type Entry = Awaited<ReturnType<typeof readSubscriptionFeed>>[number];

function webUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, pageUrl("/"));
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function paragraphs(value: string): string {
  return value
    .split(/\n\s*\n/u)
    .filter(Boolean)
    .map((part) => `<p>${escapeXml(part).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function entryHtml({ item, document, assets }: Entry): string {
  const detail = pageUrl(`/updates/${encodeURIComponent(item.id)}`);
  const source = webUrl(item.url);
  const full = document && ["full", "full_with_translation", "excerpt"].includes(document.textMode);
  const body = full
    ? document.publicTranslation || document.publicText || item.summary
    : item.summary;
  const canShowMedia =
    item.media &&
    item.media.presentationMode !== "link_only" &&
    ["safe", "suggestive"].includes(item.media.safetyRating) &&
    document?.textMode !== "withdrawn";
  const images = canShowMedia
    ? assets.filter((asset) => asset.mimeType.startsWith("image/") && webUrl(asset.url))
    : [];
  const cover = !images.length ? webUrl(item.animeCoverUrl) : null;
  const image = (url: string, caption: string) =>
    `<figure><a href="${escapeXml(detail)}"><img src="${escapeXml(url)}" alt="${escapeXml(caption)}" style="max-width:100%;height:auto" /></a><figcaption>${escapeXml(caption)}</figcaption></figure>`;
  const figures = images.map((asset) =>
    image(
      asset.url,
      [asset.altText || item.title, item.media?.creatorName].filter(Boolean).join(" · "),
    ),
  );
  if (cover) figures.push(image(cover, `${item.animeTitle ?? "关联作品"} · 作品封面`));
  const spoiler =
    item.spoilerLevel !== "none" || (item.media && item.media.spoilerLevel !== "none");
  return [
    spoiler ? "<p><strong>剧透提示：下文及图片涉及剧情。</strong></p>" : "",
    `<p>${escapeXml(item.animeTitle ?? "百合季情报")} · ${escapeXml(item.sourceName)}</p>`,
    `<p>原消息时间：${escapeXml(item.publishedAt)}</p>`,
    document?.authorName ? `<p>作者：${escapeXml(document.authorName)}</p>` : "",
    figures[0] ?? "",
    document?.textMode === "excerpt" ? "<p>以下为原文节选。</p>" : "",
    paragraphs(body),
    ...figures.slice(1),
    item.media?.rightsNote ? `<p>${escapeXml(item.media.rightsNote)}</p>` : "",
    `<p><a href="${escapeXml(detail)}">查看百合季详情与图片</a>${source ? ` · <a href="${escapeXml(source)}">原始来源</a>` : ""}</p>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderRss(entries: Entry[], search: FeedSearch): string {
  const animeTitle =
    entries.find(({ item }) => item.animeSlug === search.anime)?.item.animeTitle ?? undefined;
  const title = `百合季 · ${subscriptionLabel(search, animeTitle)}`;
  const self = pageUrl(subscriptionPath(search));
  const feedPage = self.replace("/rss.xml", "/feed");
  const feed = new Feed({
    title,
    id: self,
    link: feedPage,
    description: `百合季图文情报订阅：${subscriptionLabel(search, animeTitle)}`,
    language: "zh-CN",
    ttl: 5,
    feedLinks: { rss: self },
    // Avoid a changing build timestamp invalidating otherwise identical responses.
    updated: new Date(entries[0]?.createdAt ?? 0),
    generator: false,
  });
  for (const entry of entries) {
    const { item } = entry;
    const detail = pageUrl(`/updates/${encodeURIComponent(item.id)}`);
    feed.addItem({
      title: `${item.spoilerLevel !== "none" ? "【剧透】" : ""}${item.title}`,
      link: detail,
      date: new Date(entry.createdAt),
      description: paragraphs(item.summary),
      content: entryHtml(entry),
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

export const rssRoutes = new Hono<{ Bindings: Env }>().get("/rss.xml", async (context) => {
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
  const entries = await readSubscriptionFeed(context.env.DB, {
    animeSlug: search.anime,
    contentClasses: feedClasses(search),
    query: search.q,
  });
  const xml = renderRss(entries, search);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(xml));
  const etag = `"${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
  context.header("Content-Type", "application/rss+xml; charset=utf-8");
  context.header("Cache-Control", "public, max-age=300, must-revalidate");
  context.header("ETag", etag);
  const tags = context.req
    .header("If-None-Match")
    ?.split(",")
    .map((tag) => tag.trim().replace(/^W\//, ""));
  return tags?.some((tag) => tag === etag || tag === "*")
    ? context.body(null, 304)
    : context.body(xml);
});
