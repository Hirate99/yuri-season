import { DomUtils, parseDocument } from "htmlparser2";

import { stableFingerprint } from "~/shared/fingerprint";
import type { NormalizedSource, SourceRecord } from "../types";
import { textFromNodes } from "./html-text";

export async function htmlArticleItems(
  raw: string,
  source: SourceRecord,
): Promise<NormalizedSource[]> {
  const document = parseDocument(raw, { decodeEntities: true });

  const articles = DomUtils.findAll(
    (element) => element.name.toLowerCase() === "article",
    document,
  );

  const entries = articles
    .map((article) => {
      const heading = DomUtils.findOne(
        (element) => /^h[1-4]$/i.test(element.name),
        article.children,
      );

      const time = DomUtils.findOne(
        (element) => element.name.toLowerCase() === "time",
        article.children,
      );

      const title = heading ? textFromNodes(heading) : null;
      const excerpt = textFromNodes(article).slice(0, 24_000);
      const id = article.attribs.id ?? null;

      if (!title || /^news$/i.test(title) || title.length < 4 || excerpt.length < title.length)
        return null;

      const canonical = new URL(source.url);
      if (id) canonical.hash = id;

      return {
        title,
        excerpt,
        id,
        canonicalUrl: canonical.toString(),
        publishedAt: time ? textFromNodes(time) : null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .slice(0, 60);

  return Promise.all(
    entries.map(async (entry) => ({
      sourceItemId: entry.id ?? entry.canonicalUrl,
      canonicalUrl: entry.canonicalUrl,
      title: entry.title,
      excerpt: entry.excerpt,
      publicText: entry.excerpt,
      authorName: null,
      publishedAt: entry.publishedAt,
      contentHash: await stableFingerprint(
        `${entry.id ?? entry.canonicalUrl}|${entry.title}|${entry.excerpt}|${entry.publishedAt ?? ""}`,
      ),
      contentType: "text/html",
      language: null,
      metadata: { normalization: "html-article" },
    })),
  );
}
