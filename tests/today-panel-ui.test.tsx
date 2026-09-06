import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { CatalogResponse } from "@/domain";
import { TodayPanel } from "@/components/today-panel";

const catalog: CatalogResponse = {
  season: {
    id: "summer",
    slug: "2026-summer",
    label: "2026 夏",
    startsOn: "2026-07-01",
    endsOn: "2026-09-30",
  },
  anime: [
    {
      id: "today",
      slug: "today",
      titleZh: "今天的作品",
      titleJa: "今日",
      coverUrl: null,
      yuriKind: "canon",
      yuriStatus: "confirmed",
      currentEpisode: 9,
      primarySlot: {
        id: "slot",
        label: "TOKYO MX",
        weekday: 5,
        localTime: "23:30",
        timezone: "Asia/Tokyo",
        isPrimary: true,
        platformUrl: null,
      },
    },
  ],
  events: [],
  generatedAt: "2026-09-05T01:00:00Z",
};

async function renderPanel(data: CatalogResponse) {
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: createRootRoute({
      component: () => (
        <TodayPanel
          catalog={data}
          viewerTimeZone="America/Los_Angeles"
          renderedAt={data.generatedAt}
        />
      ),
    }),
  });
  await router.load();
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

test("today panel keeps the day's only broadcast visible after it has aired", async () => {
  const html = await renderPanel(catalog);
  expect(html).toContain("今天的作品");
  expect(html).toContain("23:30");
  expect(html).toContain('href="/calendar"');
  expect(html).not.toContain("今天暂无放送或活动");
});

test("today panel retains a clear empty state and calendar entry on quiet days", async () => {
  const html = await renderPanel({ ...catalog, anime: [] });
  expect(html).toContain('id="today-title"');
  expect(html).toContain("今天暂无放送或活动。");
  expect(html).toContain('href="/calendar"');
});
