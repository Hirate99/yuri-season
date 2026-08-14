import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";

import type { PublicationDetailResponse } from "@/domain";
import { PublicationMediaCarousel, publicationCarouselImages } from "@/components/publication-media-carousel";
import { PublicationPage } from "@/pages/publication-page";

const data: PublicationDetailResponse = {
  item: {
    id: "feed-translation",
    animeId: "anime-yumemita",
    animeSlug: "bang-dream-yumemita",
    animeTitle: "BanG Dream! YUME∞MITA",
    animeCoverUrl: null,
    personId: "person-fuji-miyako",
    personName: "藤都子",
    characterId: null,
    characterName: null,
    contentClass: "cast_post",
    sourceIdentity: "cast",
    title: "藤都子发布角色配图",
    summary: "藤都子在本人认证账号发布角色配图。",
    url: "https://x.com/example/status/1",
    sourceName: "藤都子",
    sourceAccount: "@miyako_yumemita",
    importance: 2,
    publishedAt: "2026-08-13T14:30:00Z",
    safetyRating: "safe",
    spoilerLevel: "none",
    autoPublished: true,
    pinned: false,
    media: {
      id: "media-translation",
      contentClass: "creator_art",
      title: "角色配图",
      creatorName: "藤都子",
      creatorUrl: "https://x.com/example",
      originalUrl: "https://x.com/example/status/1",
      previewUrl: "https://r2.i-yuri.com/yuri/example.jpg",
      presentationMode: "remote_preview",
      safetyRating: "safe",
      spoilerLevel: "none",
      rightsNote: "R2 仅缓存相同公开图片字节",
      publishedAt: "2026-08-13T14:30:00Z",
    },
  },
  document: {
    sourceTitle: "角色配图",
    authorName: "藤都子",
    sourceLanguage: "ja",
    publicText: "「私たち運命ですね」",
    publicTranslation: "“我们命中注定呢”",
    textMode: "full_with_translation",
    sourceStatus: "active",
    capturedAt: "2026-08-13T20:10:00Z",
    lastVerifiedAt: null,
  },
  assets: [],
  corrections: [],
};

describe("publication page presentation", () => {
  test("groups image variants into one carousel slide per source image", () => {
    const assets: PublicationDetailResponse["assets"] = [
      { id: "second-preview", url: "https://cdn.test/second-preview.webp", sourceUrl: "https://source.test/second.jpg", mimeType: "image/webp", width: 1000, height: 1000, sortOrder: 1, variant: "preview", altText: "第二张", rightsStatus: "press_kit" },
      { id: "first-thumb", url: "https://cdn.test/first-thumb.webp", sourceUrl: "https://source.test/first.jpg", mimeType: "image/webp", width: 320, height: 320, sortOrder: 0, variant: "thumbnail", altText: "第一张", rightsStatus: "press_kit" },
      { id: "first-preview", url: "https://cdn.test/first-preview.webp", sourceUrl: "https://source.test/first.jpg", mimeType: "image/webp", width: 1000, height: 1000, sortOrder: 0, variant: "preview", altText: "第一张", rightsStatus: "press_kit" },
    ];

    expect(publicationCarouselImages(assets, null, "图片")).toEqual([
      expect.objectContaining({ id: "first-preview", sourceUrl: "https://source.test/first.jpg" }),
      expect.objectContaining({ id: "second-preview", sourceUrl: "https://source.test/second.jpg" }),
    ]);
  });

  test("renders one image directly without carousel chrome or a fixed black square", () => {
    const html = renderToStaticMarkup(
      <PublicationMediaCarousel
        assets={[]}
        media={data.item.media}
        fallbackAlt={data.item.title}
      />,
    );

    expect(html).toContain("https://r2.i-yuri.com/yuri/example.jpg");
    expect(html).not.toContain("aria-roledescription=\"carousel\"");
    expect(html).not.toContain("上一张图片");
    expect(html).not.toContain("下一张图片");
    expect(html).not.toContain("aspect-square");
    expect(html).not.toContain("bg-[#111216]");
  });

  test("shows original text and translation without storage implementation copy", async () => {
    const routeTree = createRootRoute({ component: () => <PublicationPage data={data} /> });
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await router.load();
    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    expect(html).toContain("来源原文");
    expect(html).toContain("中文翻译");
    expect(html).toContain("私たち運命ですね");
    expect(html).toContain("我们命中注定呢");
    expect(html).toContain("图片来自原帖");
    expect(html).toContain("w-[calc(100%-2.5rem)]");
    expect(html).not.toContain("R2 仅缓存相同公开图片字节");
  });
});
