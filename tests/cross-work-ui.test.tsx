import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { AdminAnimeSummary, FeedItem } from "@/domain";
import { FeedCard } from "@/components/feed-card";
import { DiscussionsEditor } from "@/features/admin/discussions-editor";

const anime = [
  { id: "anime-a", titleZh: "作品 A", titleJa: "作品 A", slug: "a", seasonId: "summer", seasonLabel: "2026 夏" },
  { id: "anime-b", titleZh: "作品 B", titleJa: "作品 B", slug: "b", seasonId: "summer", seasonLabel: "2026 夏" },
  { id: "anime-c", titleZh: "作品 C", titleJa: "作品 C", slug: "c", seasonId: "autumn", seasonLabel: "2026 秋" },
] as AdminAnimeSummary[];

describe("cross-work discussion UI", () => {
  test("offers season-wide selection with explicit exclusions", () => {
    const html = renderToStaticMarkup(<DiscussionsEditor
      items={[]}
      anime={anime}
      currentAnimeId="anime-a"
      busyKey={null}
      onSave={async () => {}}
      onUnlink={async () => {}}
      onDeleteEverywhere={async () => {}}
    />);

    expect(html).toContain("全选当前季度");
    expect(html).toContain("全选全部作品");
    expect(html).toContain("先全选，再取消少数例外");
  });

  test("separates unlinking from destructive global deletion", () => {
    const html = renderToStaticMarkup(<DiscussionsEditor
      items={[{
        id: "discussion-shared", platform: "百合会", title: "集中讨论",
        url: "https://bbs.example.test/shared", note: null, isActive: true,
        lastActivityAt: null, lastCheckedAt: null, sharedAnimeCount: 3,
        animeIds: ["anime-a", "anime-b", "anime-c"],
      }]}
      anime={anime}
      currentAnimeId="anime-a"
      busyKey={null}
      onSave={async () => {}}
      onUnlink={async () => {}}
      onDeleteEverywhere={async () => {}}
    />);

    expect(html).toContain("从本作移除");
    expect(html).toContain("彻底删除");
    expect(html).toContain("将从 3 部作品及 Feed 撤下");
  });

  test("labels a shared thread without presenting one work as its sole owner", () => {
    const item = {
      id: "feed-shared",
      animeId: "anime-a",
      animeSlug: "a",
      animeTitle: "作品 A",
      animeCoverUrl: "https://example.test/a.jpg",
      relatedAnime: anime.map((work) => ({ id: work.id, slug: work.slug, title: work.titleZh, coverUrl: null })),
      personId: null,
      personName: null,
      characterId: null,
      characterName: null,
      contentClass: "community_thread",
      sourceIdentity: "community",
      title: "百合会综合讨论串",
      summary: "覆盖本季度大部分作品。",
      url: "https://bbs.example.test/shared",
      sourceName: "百合会",
      sourceAccount: null,
      importance: 2,
      publishedAt: "2026-08-12T12:00:00+09:00",
      safetyRating: "safe",
      spoilerLevel: "none",
      autoPublished: false,
      pinned: false,
      media: null,
    } satisfies FeedItem;
    const html = renderToStaticMarkup(<FeedCard item={item} />);

    expect(html).toContain("跨作品 · 3 部");
    expect(html).toContain("作品 A");
    expect(html).toContain("作品 B");
    expect(html).not.toContain("作品 A 封面");
  });
});
