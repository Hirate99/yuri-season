import { DomUtils, parseDocument } from "htmlparser2";
import type { Document, Element } from "domhandler";

import { stableFingerprint } from "~/shared/fingerprint";
import type { NormalizedSource, SourceRecord } from "../types";
import { htmlArticleItems } from "./html-articles";
import { textFromHtml, textFromNodes } from "./html-text";

function resolveUrl(value: string, base: string): string | null {
  try {
    const url = new URL(textFromHtml(value), base);

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function firstElement(document: Document | Element, name: string): Element | null {
  return DomUtils.findOne((element) => element.name.toLowerCase() === name, document);
}

function metaContent(document: Document, key: string): string | null {
  const element = DomUtils.findOne(
    (candidate) =>
      candidate.name.toLowerCase() === "meta" &&
      (candidate.attribs.property === key || candidate.attribs.name === key),
    document,
  );

  return element?.attribs.content ?? null;
}

function canonicalFromHtml(document: Document, base: string): string {
  const element = DomUtils.findOne(
    (candidate) =>
      candidate.name.toLowerCase() === "link" &&
      (candidate.attribs.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"),
    document,
  );

  const resolved = resolveUrl(element?.attribs.href ?? "", base);
  if (resolved) return resolved;

  const url = new URL(base);

  url.hash = "";

  return url.toString();
}

function communityTitle(document: Document, fallback: string): string {
  const subject = DomUtils.findOne((element) => element.attribs.id === "thread_subject", document);
  const pageTitle = firstElement(document, "title");

  const value = subject
    ? textFromNodes(subject)
    : (metaContent(document, "og:title") ?? (pageTitle ? textFromNodes(pageTitle) : fallback));

  return (
    value
      .replace(/\s+-\s+Powered by Discuz!\s*$/i, "")
      .split(/\s+-\s+(?=[^-]+\s+-\s+百合会(?:\s+-|$))/i)[0]
      .trim() || fallback
  );
}

function communityCount(document: Document, label: string): number | null {
  const spans = DomUtils.findAll((element) => element.name.toLowerCase() === "span", document);

  const labelIndex = spans.findIndex((element) =>
    textFromNodes(element).replace(/\s+/g, "").startsWith(`${label}:`),
  );
  if (labelIndex < 0) return null;

  for (const element of spans.slice(labelIndex + 1, labelIndex + 4)) {
    const text = textFromNodes(element).replaceAll(",", "").trim();
    if (!/^\d+$/.test(text)) continue;

    const value = Number(text);

    return Number.isSafeInteger(value) ? value : null;
  }

  return null;
}

async function communityItem(raw: string, source: SourceRecord): Promise<NormalizedSource[]> {
  const document = parseDocument(raw, { decodeEntities: true });
  const canonicalUrl = canonicalFromHtml(document, source.url);
  const title = communityTitle(document, source.label);
  const replyCount = communityCount(document, "回复");
  const viewCount = communityCount(document, "查看");

  const lastPostId = DomUtils.findAll(
    (element) => /^authorposton\d+$/i.test(element.attribs.id ?? ""),
    document,
  )
    .map((element) => Number(element.attribs.id.slice("authorposton".length)))
    .filter(Number.isSafeInteger)
    .reduce<number | null>((latest, id) => (latest === null || id > latest ? id : latest), null);

  const activity = replyCount === null ? "" : ` · 回复 ${replyCount}`;

  return [
    {
      sourceItemId: canonicalUrl,
      canonicalUrl,
      title,
      excerpt: `${title}${activity}`,
      publicText: null,
      authorName: null,
      publishedAt: null,
      contentHash: await stableFingerprint(
        `${canonicalUrl}|${title}|${replyCount ?? ""}|${lastPostId ?? ""}`,
      ),
      contentType: "text/html",
      language: "zh",
      metadata: { normalization: "community-thread", replyCount, viewCount, lastPostId },
    },
  ];
}

function isActionLink(url: string): boolean {
  const target = new URL(url);

  return (
    target.pathname.endsWith("/home.php") ||
    target.pathname.endsWith("/member.php") ||
    target.searchParams.has("formhash") ||
    target.searchParams.get("mod") === "spacecp" ||
    ["favorite", "recommend", "report", "login", "logout"].some((action) =>
      target.href.toLowerCase().includes(action),
    )
  );
}

function splitDatedTitle(value: string): { title: string; publishedAt: string | null } {
  const match = value.match(/^(\d{4})[./-](\d{2})[./-](\d{2})\s+(.+)$/);
  if (!match) return { title: value, publishedAt: null };

  return { title: match[4].trim(), publishedAt: `${match[1]}-${match[2]}-${match[3]}` };
}

async function htmlItems(raw: string, source: SourceRecord): Promise<NormalizedSource[]> {
  const articles = await htmlArticleItems(raw, source);
  if (articles.length > 0) return articles;

  const document = parseDocument(raw, { decodeEntities: true });

  const links = DomUtils.findAll(
    (element) => element.name.toLowerCase() === "a" && Boolean(element.attribs.href),
    document,
  )
    .map((element) => ({
      url: resolveUrl(element.attribs.href, source.url),
      title: textFromNodes(element),
    }))
    .filter((item): item is { url: string; title: string } =>
      Boolean(
        item.url &&
        !isActionLink(item.url) &&
        !/^news$/i.test(item.title) &&
        item.title.length >= 4 &&
        item.title.length <= 180 &&
        /news|info|topic|article|post|detail|\d{6,}/i.test(item.url),
      ),
    );

  const unique = [...new Map(links.map((item) => [item.url, item])).values()].slice(0, 40);

  if (unique.length === 0) {
    const excerpt = textFromNodes(document).slice(0, 24_000);

    return [
      {
        sourceItemId: null,
        canonicalUrl: source.url,
        title: source.label,
        excerpt,
        publicText: excerpt,
        authorName: null,
        publishedAt: null,
        contentHash: await stableFingerprint(excerpt),
        contentType: "text/html",
        language: null,
        metadata: { normalization: "page-text" },
      },
    ];
  }

  return Promise.all(
    unique.map(async (item) => {
      const normalized = splitDatedTitle(item.title);

      return {
        sourceItemId: item.url,
        canonicalUrl: item.url,
        title: normalized.title,
        excerpt: normalized.title,
        publicText: null,
        authorName: null,
        publishedAt: normalized.publishedAt,
        contentHash: await stableFingerprint(
          `${item.url}|${normalized.title}|${normalized.publishedAt ?? ""}`,
        ),
        contentType: "text/html",
        language: null,
        metadata: { normalization: "news-link" },
      };
    }),
  );
}

function xmlValue(entry: Element, names: string[]): string | null {
  const lowered = new Set(names.map((name) => name.toLowerCase()));

  const element = DomUtils.findOne(
    (candidate) => lowered.has(candidate.name.toLowerCase()),
    entry.children,
  );

  return element ? textFromNodes(element) : null;
}

async function feedItems(raw: string, source: SourceRecord): Promise<NormalizedSource[]> {
  const document = parseDocument(raw, { xmlMode: true, decodeEntities: true });

  const entries = DomUtils.findAll(
    (element) => ["item", "entry"].includes(element.name.toLowerCase()),
    document,
  ).slice(0, 60);

  return Promise.all(
    entries.map(async (entry) => {
      const title = xmlValue(entry, ["title"]);

      const atomLink = DomUtils.findOne(
        (element) => element.name.toLowerCase() === "link" && Boolean(element.attribs.href),
        entry.children,
      );

      const link =
        resolveUrl(atomLink?.attribs.href ?? xmlValue(entry, ["link"]) ?? source.url, source.url) ??
        source.url;

      const sourceItemId = xmlValue(entry, ["guid", "id"]) ?? link;
      const excerpt = xmlValue(entry, ["description", "summary", "content"]) ?? title ?? "";
      const publishedAt = xmlValue(entry, ["pubDate", "published", "updated"]);

      return {
        sourceItemId,
        canonicalUrl: link,
        title,
        excerpt: excerpt.slice(0, 24_000),
        publicText: excerpt.slice(0, 24_000),
        authorName: xmlValue(entry, ["author", "dc:creator"]),
        publishedAt,
        contentHash: await stableFingerprint(`${sourceItemId}|${title}|${excerpt}|${publishedAt}`),
        contentType: "application/feed+xml",
        language: null,
        metadata: { normalization: "feed-entry" },
      };
    }),
  );
}

async function jsonItems(raw: string, source: SourceRecord): Promise<NormalizedSource[]> {
  const parsed: unknown = JSON.parse(raw);
  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;

  const data =
    root?.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null;

  const values = Array.isArray(parsed)
    ? parsed
    : Array.isArray(root?.rows)
      ? root.rows
      : Array.isArray(root?.news)
        ? root.news
        : Array.isArray(root?.data)
          ? root.data
          : Array.isArray(data?.rows)
            ? data.rows
            : [parsed];

  return Promise.all(
    values.slice(0, 100).map(async (value, index) => {
      const object: Record<string, unknown> =
        value && typeof value === "object" ? (value as Record<string, unknown>) : { value };

      const title = textFromHtml(
        String(object.name_cn ?? object.title ?? object.name ?? source.label),
      );

      const sourceItemId = String(
        object.id ?? object.guid ?? object.uniqueId ?? object.url ?? index,
      );

      const stableObject =
        source.sourceType === "bangumi"
          ? Object.fromEntries(
              [
                "id",
                "date",
                "platform",
                "images",
                "summary",
                "name",
                "name_cn",
                "infobox",
                "total_episodes",
                "eps",
                "meta_tags",
                "volumes",
                "series",
                "locked",
                "nsfw",
                "type",
              ]
                .filter((key) => key in object)
                .map((key) => [key, object[key]]),
            )
          : Object.fromEntries(
              Object.entries(object).map(([key, field]) => [
                key,
                typeof field === "string" &&
                ["body", "content", "description", "summary"].includes(key)
                  ? textFromHtml(field)
                  : field,
              ]),
            );

      const excerpt = JSON.stringify(stableObject).slice(0, 24_000);

      const publicText = ["body", "content", "description", "summary", "text"]
        .map((key) => object[key])
        .find(
          (field): field is string => typeof field === "string" && textFromHtml(field).length > 0,
        );

      const normalizedPublicText = publicText ? textFromHtml(publicText).slice(0, 24_000) : title;

      const rawDirectUrl =
        typeof object.directLinkUrl === "string"
          ? object.directLinkUrl
          : typeof object.link === "string"
            ? object.link
            : typeof object.url === "string"
              ? object.url
              : null;

      const directUrl = rawDirectUrl?.trim() || null;

      const uniqueId =
        typeof object.uniqueId === "string" || typeof object.uniqueId === "number"
          ? String(object.uniqueId)
          : null;

      const templatedId =
        uniqueId ??
        (source.itemUrlTemplate && (typeof object.id === "string" || typeof object.id === "number")
          ? String(object.id)
          : null);

      const derivedUrl = templatedId
        ? (source.itemUrlTemplate?.replaceAll("{id}", encodeURIComponent(templatedId)) ??
          `${templatedId}.html`)
        : null;

      const url = resolveUrl(directUrl ?? derivedUrl ?? source.url, source.url) ?? source.url;

      const rawPublishedAt =
        object.published_at ?? object.datetime ?? object.date ?? object.publishTime;

      const publishedAt =
        typeof rawPublishedAt === "number" ||
        (typeof rawPublishedAt === "string" && /^\d{12,}$/.test(rawPublishedAt))
          ? new Date(Number(rawPublishedAt)).toISOString()
          : typeof rawPublishedAt === "string"
            ? rawPublishedAt
            : null;

      const previewUrl =
        typeof object.thumbnail === "string"
          ? resolveUrl(object.thumbnail, source.url)
          : typeof object.thumb === "string"
            ? resolveUrl(
                source.url.endsWith("/news/newslist.json")
                  ? `thumbnail/${object.thumb}`
                  : object.thumb,
                source.url,
              )
            : null;

      return {
        sourceItemId,
        canonicalUrl: url,
        title,
        excerpt,
        publicText: normalizedPublicText,
        authorName: typeof object.author === "string" ? object.author : null,
        publishedAt,
        contentHash: await stableFingerprint(`${sourceItemId}|${excerpt}`),
        contentType: "application/json",
        language: null,
        metadata: {
          normalization: "json-record",
          previewUrl,
          publicText: normalizedPublicText,
        },
      };
    }),
  );
}

function looksLikeFeed(raw: string): boolean {
  const document = parseDocument(raw, { xmlMode: true });

  return Boolean(
    DomUtils.findOne((element) => ["rss", "feed"].includes(element.name.toLowerCase()), document),
  );
}

export function normalizeSource(raw: string, contentType: string, source: SourceRecord) {
  if (source.sourceType === "community") return communityItem(raw, source);
  if (contentType.includes("json")) return jsonItems(raw, source);

  if (
    contentType.includes("rss") ||
    contentType.includes("atom") ||
    looksLikeFeed(raw.slice(0, 2_000))
  ) {
    return feedItems(raw, source);
  }

  return htmlItems(raw, source);
}

export function normalizerVersion(source: Pick<SourceRecord, "sourceType">): string {
  return source.sourceType === "community" ? "community-thread@2" : "generic@2";
}
