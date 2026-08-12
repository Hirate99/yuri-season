import { parseDocument } from "htmlparser2";

type NodeLike = {
  type?: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  childNodes?: NodeLike[];
};

const slugs = new Set([
  "ichigekidanko", "kobotokechinko", "etaimochiko", "susancanon",
  "otohanahoney", "mikasahako", "hiurahayami",
]);

function walk(root: NodeLike): NodeLike[] {
  const result: NodeLike[] = [];
  const visit = (node: NodeLike) => {
    result.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(root);
  return result;
}

function textContent(root: NodeLike): string {
  if (root.type === "text") return root.data ?? "";
  return (root.childNodes ?? []).map(textContent).join(" ").replaceAll(/\s+/g, " ").trim();
}

const pageUrl = "https://dodge-danko.com/";
const response = await fetch(pageUrl, { headers: { "user-agent": "Mozilla/5.0" } });
const document = parseDocument(await response.text()) as unknown as NodeLike;
const containers = walk(document).filter((node) => node.name === "li"
  && (node.attribs?.class ?? "").split(/\s+/).some((className) => slugs.has(className)));

for (const container of containers) {
  const slug = (container.attribs?.class ?? "").split(/\s+/).find((className) => slugs.has(className))!;
  const descendants = walk(container);
  const portrait = descendants.find((node) => node.name === "img" && node.attribs?.class === "sp_b"
    && (node.attribs?.src ?? "").includes(`/character/${slug}/`));
  console.log(JSON.stringify({
    slug,
    text: textContent(container),
    portraitUrl: portrait?.attribs?.src ? new URL(portrait.attribs.src, pageUrl).href : null,
  }, null, 2));
}
