import { parseDocument } from "htmlparser2";
import type { AnyNode } from "domhandler";

const IGNORED_ELEMENTS = new Set(["script", "style", "svg"]);

function collectText(node: AnyNode, segments: string[]): void {
  if (node.type === "text") {
    segments.push(node.data);
    return;
  }
  if ("name" in node && IGNORED_ELEMENTS.has(node.name.toLowerCase())) return;
  if ("children" in node) {
    for (const child of node.children) collectText(child, segments);
  }
}

export function textFromNodes(nodes: AnyNode | AnyNode[]): string {
  const segments: string[] = [];
  for (const node of Array.isArray(nodes) ? nodes : [nodes]) collectText(node, segments);
  return segments.join(" ").replace(/\s+/g, " ").trim();
}

export function textFromHtml(input: string): string {
  return textFromNodes(parseDocument(input, { decodeEntities: true }));
}
