import { parseDocument } from "htmlparser2";

type NodeLike = {
  type?: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  childNodes?: NodeLike[];
};

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

function hasClass(node: NodeLike, name: string): boolean {
  return (node.attribs?.class ?? "").split(/\s+/).includes(name);
}

for (const pageUrl of process.argv.slice(2)) {
  const response = await fetch(pageUrl, { headers: { "user-agent": "Mozilla/5.0" } });
  const document = parseDocument(await response.text()) as unknown as NodeLike;
  const all = walk(document);
  const heading = all.find((node) => node.name === "h3");
  const compactName = all.find((node) => hasClass(node, "name_ja"));
  const profile = all.find((node) => hasClass(node, "profile"));
  const data = all.find((node) => hasClass(node, "date"));
  const compactDescription = all.find((node) => hasClass(node, "chara__txt"));
  const face = all.find((node) => node.name === "img" && /\/face_[^/]+\.(?:png|webp)/i.test(node.attribs?.src ?? ""));
  const thumb = all.find((node) => node.name === "img" && /\/thumb_[^/]+\.(?:png|webp)/i.test(node.attribs?.src ?? ""));
  const absolute = (value: string | undefined) => value ? new URL(value, pageUrl).href : null;
  console.log(JSON.stringify({
    pageUrl,
    status: response.status,
    name: heading ? textContent(heading) : compactName ? textContent(compactName) : null,
    profile: profile ? textContent(profile) : null,
    data: data ? textContent(data) : compactDescription ? textContent(compactDescription) : null,
    faceUrl: absolute(face?.attribs?.src),
    thumbUrl: absolute(thumb?.attribs?.src),
  }, null, 2));
}
