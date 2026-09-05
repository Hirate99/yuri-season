import { Hono } from "hono";
import { createPublicService } from "~/application/public/service";
import { pageUrl } from "@/lib/seo";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/gu, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

export const seoRoutes = new Hono<{ Bindings: Env }>()
  .get("/robots.txt", (context) => context.text([
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin",
    `Sitemap: ${pageUrl("/sitemap.xml")}`,
    "",
  ].join("\n"), 200, { "content-type": "text/plain; charset=utf-8" }))
  .get("/sitemap.xml", async (context) => {
    const paths = await createPublicService(context.env).sitemap();
    return context.body([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...paths.map((path) => `<url><loc>${escapeXml(pageUrl(path))}</loc></url>`),
      "</urlset>",
    ].join("\n"), 200, { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" });
  });
