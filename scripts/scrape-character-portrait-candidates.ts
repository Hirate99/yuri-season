import { parseDocument } from "htmlparser2";

const defaultPages = [
  "https://taiari-anime.com/",
  "https://kimishinu-anime.com/character/",
  "https://goodbyelara.com/",
  "https://2nd.azurlane-bisoku.jp/character",
  "https://dodge-danko.com/",
  "https://www.vap.co.jp/korekaite-shine/",
  "https://magilumiere-pr.com/character/",
  "https://www.nanoha.com/EXGV/character/",
];
const pages = process.argv.slice(2).length > 0 ? process.argv.slice(2) : defaultPages;

type NodeLike = {
  type?: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  childNodes?: NodeLike[];
};

function nodes(root: NodeLike): NodeLike[] {
  const found: NodeLike[] = [];
  const visit = (node: NodeLike) => {
    if (node.type === "tag" || node.type === "script" || node.type === "style") found.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(root);
  return found;
}

function textContent(root: NodeLike): string {
  if (root.type === "text") return root.data ?? "";
  return (root.childNodes ?? []).map(textContent).join("").replaceAll(/\s+/g, " ").trim();
}

function absolute(base: string, value: string | undefined): string | null {
  if (!value || value.startsWith("data:")) return null;
  try { return new URL(value, base).href; } catch { return null; }
}

for (const pageUrl of pages) {
  try {
    const response = await fetch(pageUrl, { headers: { "user-agent": "Mozilla/5.0" } });
    const html = await response.text();
    const document = parseDocument(html) as unknown as NodeLike;
    const all = nodes(document);
    const images = all
      .filter((node) => node.name === "img" || node.name === "source")
      .map((node) => {
        const attributes = node.attribs ?? {};
        const raw = attributes.src || attributes["data-src"] || attributes["data-lazy-src"]
          || attributes.srcset?.split(/[ ,]/)[0];
        return {
          url: absolute(pageUrl, raw),
          alt: attributes.alt ?? "",
          className: attributes.class ?? "",
        };
      })
      .filter((image) => image.url && /(char|chara|character|cast|prof|person)/i
        .test(`${image.url} ${image.alt} ${image.className}`));
    const stylesheets = all
      .filter((node) => node.name === "link" && node.attribs?.rel === "stylesheet")
      .map((node) => absolute(pageUrl, node.attribs?.href))
      .filter(Boolean);
    const scripts = all
      .filter((node) => node.name === "script")
      .map((node) => absolute(pageUrl, node.attribs?.src))
      .filter(Boolean);
    const profiles = all
      .filter((node) => /\bcharacter-\d+\b/.test(node.attribs?.class ?? ""))
      .map((container) => {
        const descendants = nodes(container);
        const name = descendants.find((node) => node.name === "img" && node.attribs?.alt)?.attribs?.alt ?? "";
        const descriptionNode = descendants.find((node) => /description/i.test(node.attribs?.class ?? ""));
        return {
          key: (container.attribs?.class ?? "").match(/\bcharacter-\d+\b/)?.[0] ?? "",
          name,
          description: descriptionNode ? textContent(descriptionNode) : "",
        };
      })
      .filter((profile, index, list) => profile.description
        && list.findIndex((candidate) => candidate.key === profile.key) === index);
    const referencedAssets = [...new Set(
      [...html.matchAll(/["'(`](?<asset>[^"'()`]*(?:char|chara|character)[^"'()`]*\.(?:avif|gif|jpe?g|png|svg|webp))(?:\?[^"'()`]*)?["')`]/gi)]
        .map((match) => absolute(pageUrl, match.groups?.asset))
        .filter((value): value is string => Boolean(value)),
    )];
    console.log(JSON.stringify({
      pageUrl,
      status: response.status,
      htmlBytes: html.length,
      images,
      referencedAssets,
      profiles,
      stylesheets,
      scripts,
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ pageUrl, error: String(error) }));
  }
}
