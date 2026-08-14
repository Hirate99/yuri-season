import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";

import type { PublicationDetailResponse } from "@/domain";
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
    expect(html).not.toContain("R2 仅缓存相同公开图片字节");
  });
});
