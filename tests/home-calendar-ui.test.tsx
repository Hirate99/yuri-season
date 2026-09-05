import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import type { CatalogResponse } from "@/domain";
import { HomeCalendar } from "@/components/home-calendar";

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
      id: "friday",
      slug: "friday",
      titleZh: "周五的作品",
      titleJa: "金曜日",
      coverUrl: null,
      yuriKind: "canon",
      yuriStatus: "confirmed",
      currentEpisode: 9,
      primarySlot: {
        id: "friday-slot",
        label: "TOKYO MX",
        weekday: 5,
        localTime: "23:30",
        timezone: "Asia/Tokyo",
        isPrimary: true,
        platformUrl: null,
      },
    },
    {
      id: "monday",
      slug: "monday",
      titleZh: "周一的作品",
      titleJa: "月曜日",
      coverUrl: null,
      yuriKind: "strong",
      yuriStatus: "confirmed",
      currentEpisode: 8,
      primarySlot: {
        id: "monday-slot",
        label: "BS11",
        weekday: 1,
        localTime: "24:00",
        timezone: "Asia/Tokyo",
        isPrimary: true,
        platformUrl: null,
      },
    },
  ],
  events: [{
    id: "event",
    animeId: "friday",
    animeSlug: "friday",
    animeTitle: "周五的作品",
    characterId: null,
    characterName: null,
    characterPortraitUrl: null,
    characterPortraitSourceUrl: null,
    eventType: "event",
    title: "周末特别活动",
    startsAt: "2026-09-06T19:00:00+09:00",
    timezone: "Asia/Tokyo",
    recurrenceRule: null,
    sourceUrl: "https://example.com/event",
    verified: true,
  }],
  generatedAt: "2026-09-04T01:00:00Z",
};

async function renderCalendar(data: CatalogResponse = catalog) {
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: createRootRoute({
      component: () => (
        <HomeCalendar
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

test("home calendar turns the current week into the homepage navigation", async () => {
  const html = await renderCalendar();
  expect(html).toContain("WEEKLY INDEX · JST");
  expect(html).toContain("本周放送");
  expect(html).toContain("8月31日 — 9月6日");
  expect(html.match(/type="button"/g)).toHaveLength(7);
  expect(html).toContain("周五放送");
  expect(html).toContain("1 部");
  expect(html).toContain("周五的作品");
  expect(html).not.toContain(">周一的作品<");
  expect(html).toContain("周末特别活动");
  expect(html).toContain('href="/calendar"');
});

test("home calendar inherits the active season palette", async () => {
  const html = await renderCalendar();
  expect(html).toContain("#30396f");
  expect(html).toContain("#8fcfc6");
});

test("home calendar pages a long upcoming event list without growing the sidebar", async () => {
  const sourceEvent = catalog.events[0]!;
  const html = await renderCalendar({
    ...catalog,
    events: Array.from({ length: 4 }, (_, index) => ({
      ...sourceEvent,
      id: `event-${index + 1}`,
      title: `近期事件 ${index + 1}`,
      startsAt: `2026-09-${String(index + 6).padStart(2, "0")}T19:00:00+09:00`,
      sourceUrl: `https://example.com/event-${index + 1}`,
    })),
  });
  expect(html).toContain("1 / 2");
  expect(html).toContain('aria-label="上一组近期事件"');
  expect(html).toContain('aria-label="下一组近期事件"');
  expect(html).toContain("近期事件 3");
  expect(html).not.toContain("近期事件 4");
});

test("home calendar pages a crowded broadcast day inside the fixed panel", async () => {
  const sourceAnime = catalog.anime[0]!;
  const html = await renderCalendar({
    ...catalog,
    anime: Array.from({ length: 5 }, (_, index) => ({
      ...sourceAnime,
      id: `friday-${index + 1}`,
      slug: `friday-${index + 1}`,
      titleZh: `周五作品 ${index + 1}`,
      primarySlot: sourceAnime.primarySlot && {
        ...sourceAnime.primarySlot,
        id: `friday-slot-${index + 1}`,
        localTime: `${20 + index}:00`,
      },
    })),
  });
  expect(html).toContain('aria-label="切换本日放送页"');
  expect(html).toContain('aria-label="下一组本日放送"');
  expect(html).toContain("周五作品 4");
  expect(html).not.toContain("周五作品 5");
});

test("home calendar marks an event occurring today on the Japan calendar", async () => {
  const sourceEvent = catalog.events[0]!;
  const html = await renderCalendar({
    ...catalog,
    events: [
      {
        ...sourceEvent,
        id: "today-event",
        title: "今天的特别活动",
        startsAt: "2026-09-04T19:00:00+09:00",
      },
      {
        ...sourceEvent,
        id: "today-birthday",
        eventType: "birthday",
        title: "紫阳花 生日",
        startsAt: "2000-09-04",
      },
    ],
  });
  expect(html).toContain('data-event-today="true"');
  expect(html).toContain('data-event-birthday="true"');
  expect(html).toContain(">今天</span>");
  expect(html).toContain("今天的特别活动");
  expect(html.indexOf("紫阳花")).toBeLessThan(html.indexOf("今天的特别活动"));
  expect(html).toContain("#eb8b703d");
});
