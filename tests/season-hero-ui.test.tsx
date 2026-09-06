import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { CatalogAnime, Season } from "@/domain";
import { SeasonHero } from "@/components/season-hero";

const featured: CatalogAnime = {
  id: "featured",
  slug: "featured",
  titleZh: "主推作品",
  titleJa: "メイン作品",
  yuriKind: "canon",
  yuriStatus: "confirmed",
  currentEpisode: 8,
  coverUrl: "https://example.com/featured.webp",
  primarySlot: {
    id: "slot",
    label: "TOKYO MX",
    weekday: 5,
    localTime: "23:30",
    timezone: "Asia/Tokyo",
    platformUrl: null,
    isPrimary: true,
  },
};

const supporting = [1, 2].map((index): CatalogAnime => ({
  ...featured,
  id: `supporting-${index}`,
  slug: `supporting-${index}`,
  titleZh: `候选作品 ${index}`,
  coverUrl: `https://example.com/supporting-${index}.webp`,
}));

async function renderHero(season: Season, archived = false) {
  const routeTree = createRootRoute({
    component: () => (
      <SeasonHero
        season={season}
        count={11}
        archived={archived}
        anime={[featured, ...supporting]}
        viewerTimeZone="America/Los_Angeles"
        now={new Date("2026-09-04T12:00:00Z")}
      />
    ),
  });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

test("season hero uses one composition for all four season glyphs", async () => {
  const cases = [
    ["2026-spring", "2026 春", "2026-04-01", "2026-06-30", "春", "SPRING"],
    ["2026-summer", "2026 夏", "2026-07-01", "2026-09-30", "夏", "SUMMER"],
    ["2026-autumn", "2026 秋", "2026-10-01", "2026-12-31", "秋", "AUTUMN"],
    ["2026-winter", "2026 冬", "2026-01-01", "2026-03-31", "冬", "WINTER"],
  ] as const;

  for (const [slug, label, startsOn, endsOn, glyph, english] of cases) {
    const html = await renderHero({ id: slug, slug, label, startsOn, endsOn });
    expect(html).toContain(`data-season-glyph="${glyph}"`);
    expect(html).toContain(english);
    expect(html).toContain("部百合动画");
    expect(html).toContain("YURI ANIME INDEX");
  }
});

test("season hero binds the cover, pagination, schedule, and archive copy into the same hierarchy", async () => {
  const html = await renderHero(
    {
      id: "autumn",
      slug: "2026-autumn",
      label: "2026 秋",
      startsOn: "2026-10-01",
      endsOn: "2026-12-31",
    },
    true,
  );

  expect(html).toContain("https://example.com/featured.webp");
  expect(html).toContain("显示 候选作品 2");
  expect(html.match(/data-card-position=/g)).toHaveLength(3);
  expect(html).toContain('data-card-position="active"');
  expect(html).toContain('data-card-position="next"');
  expect(html).toContain('data-card-position="previous"');
  expect(html).toContain("23:30");
  expect(html).toContain("季度归档");
  expect(html).toContain('href="#works"');
});
