import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PostBody } from "@/features/community/markdown";

test("discussion Markdown renders formatting but never raw HTML or executable URLs", () => {
  const html = renderToStaticMarkup(<PostBody>{[
    "**加粗**，~~删除~~，[来源](https://example.com/source)",
    "- 第一项\n- 第二项",
    "| 话数 | 感想 |\n| --- | --- |\n| 1 | 好看 |",
    '<script>alert(1)</script>',
    '<iframe src="https://example.com"></iframe>',
    '<img src=x onerror="alert(1)">',
    '[攻击](javascript:alert%281%29) [编码](jav&#x61;script:alert%281%29) [数据](data:text/html,test)',
    '![封面](https://example.com/tracker.png)',
    '```html\n<img src=x onerror="alert(1)">\n```',
  ].join("\n\n")}</PostBody>);
  expect(html).toContain("<strong>加粗</strong>");
  expect(html).toContain("<del>删除</del>");
  expect(html).toContain("<li>第一项</li>");
  expect(html).toContain("<table>");
  expect(html).toContain('href="https://example.com/source"');
  expect(html).toContain("&lt;img");
  expect(html).not.toMatch(/<(script|iframe|img)\b|href="(?:javascript|data):|tracker\.png/);
});
