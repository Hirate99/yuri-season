import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seoRoutes } from "~/http/seo";
import { readSitemapPaths } from "~/repositories/sitemap";
import { readPublicationPage } from "~/application/public/service";
import { publicationHead, seoHead } from "@/lib/seo";
import { TestD1 } from "./support/d1-adapter";

describe("search metadata", () => {
  test("uses absolute canonical and share URLs without cutting descriptions mid-sentence", () => {
    const head = seoHead({ title: "作品", path: "/anime/example", description: `简介\n  ${"文".repeat(180)}`, image: "/cover.webp" });
    expect(head.links).toEqual([{ rel: "canonical", href: "https://i-yuri.com/anime/example" }]);
    expect(head.meta).toContainEqual({ property: "og:image", content: "https://i-yuri.com/cover.webp" });
    expect(head.meta).toContainEqual({ name: "twitter:card", content: "summary_large_image" });
    const description = head.meta.find((meta) => meta.name === "description")?.content;
    expect(description).toStartWith("简介 文");
    expect(description).toBe(`简介 ${"文".repeat(180)}`);
  });

  test("does not fabricate an image when none is available", () => {
    const head = seoHead({ title: "片单", path: "/seasons", noindex: true });
    expect(head.meta.some((meta) => meta.property === "og:image")).toBe(false);
    expect(head.meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  });
});

describe("public sitemap", () => {
  let db: TestD1;
  beforeEach(async () => {
    db = new TestD1();
    for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
      db.exec(await Bun.file(path).text());
    }
  });
  afterEach(() => db.close());

  test("only lists reachable public publications and canonical detail paths", async () => {
    const paths = await readSitemapPaths(db.binding());
    expect(paths).toContain("/");
    expect(paths).toContain("/season/2026-summer");
    expect(paths).toContain("/anime/kimishinu");
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.some((path) => path.startsWith("/feed/") || path.startsWith("/admin"))).toBe(false);
    const publications = paths.filter((path) => path.startsWith("/updates/"));
    expect(publications.length).toBeGreaterThan(0);
    for (const path of publications) {
      const page = await readPublicationPage(db.binding(), decodeURIComponent(path.slice("/updates/".length)));
      expect(page).not.toBeNull();
      expect(publicationHead(page!, page!.item.id).links[0].href).toBe(`https://i-yuri.com${path}`);
    }
  });

  test("removes withdrawn, adult, and editorial items immediately", async () => {
    const visible = db.sqlite.query("SELECT id FROM feed_items WHERE withdrawn_at IS NULL AND safety_rating != 'adult' AND content_class != 'editorial' LIMIT 3").all() as { id: string }[];
    expect(visible).toHaveLength(3);
    db.sqlite.query("UPDATE feed_items SET withdrawn_at = '2026-09-04T00:00:00Z' WHERE id = ?").run(visible[0].id);
    db.sqlite.query("UPDATE feed_items SET safety_rating = 'adult' WHERE id = ?").run(visible[1].id);
    db.sqlite.query("UPDATE feed_items SET content_class = 'editorial' WHERE id = ?").run(visible[2].id);
    const paths = await readSitemapPaths(db.binding());
    for (const row of visible) expect(paths).not.toContain(`/updates/${encodeURIComponent(row.id)}`);
  });

  test("serves XML and robots for GET/HEAD, with correct URL escaping", async () => {
    db.sqlite.query("UPDATE anime SET slug = ? WHERE id = 'anime-kimishinu'").run("作品&'测试");
    const env = { DB: db.binding() } as Env;
    const response = await seoRoutes.request("https://preview.example/sitemap.xml", {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    const xml = await response.text();
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain("https://i-yuri.com/anime/%E4%BD%9C%E5%93%81%26&apos;%E6%B5%8B%E8%AF%95");
    expect(xml).not.toContain("preview.example");
    const head = await seoRoutes.request("https://i-yuri.com/sitemap.xml", { method: "HEAD" }, env);
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    const robots = await seoRoutes.request("https://i-yuri.com/robots.txt", {}, env);
    expect(robots.headers.get("content-type")).toContain("text/plain");
    expect(await robots.text()).toContain("Sitemap: https://i-yuri.com/sitemap.xml");
  });
});
