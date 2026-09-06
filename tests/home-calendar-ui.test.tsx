import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
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
  events: [
    {
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
      endsAt: null,
      timezone: "Asia/Tokyo",
      recurrenceRule: null,
      sourceUrl: "https://example.com/event",
      verified: true,
      status: "scheduled",
    },
  ],
  generatedAt: "2026-09-04T08:00:00Z",
};

async function renderCalendar(
  data: CatalogResponse = catalog,
  viewerTimeZone = "America/Los_Angeles",
) {
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: createRootRoute({
      component: () => (
        <HomeCalendar
          catalog={data}
          viewerTimeZone={viewerTimeZone}
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
  expect(html).toContain("WEEKLY INDEX · PDT");
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

test("home calendar groups and sorts extended hours within the viewer's day and week", async () => {
  const source = catalog.anime[0]!;
  const data: CatalogResponse = {
    ...catalog,
    generatedAt: "2026-09-06T17:00:00Z",
    anime: [
      {
        ...source,
        id: "late",
        slug: "late",
        titleZh: "深夜节目",
        primarySlot: { ...source.primarySlot!, weekday: 0, localTime: "25:00" },
      },
      {
        ...source,
        id: "early",
        slug: "early",
        titleZh: "凌晨节目",
        primarySlot: { ...source.primarySlot!, weekday: 1, localTime: "00:00" },
      },
    ],
  };
  const pacific = await renderCalendar(data);
  expect(pacific).toContain("8月31日 — 9月6日");
  expect(pacific).toContain("2026.09.06");
  expect(pacific).toContain("周日放送");
  expect(pacific).toContain("今天 · 2");
  expect(pacific).toContain("08:00");
  expect(pacific).toContain("09:00");
  expect(pacific.indexOf("凌晨节目")).toBeLessThan(pacific.indexOf("深夜节目"));
  const japan = await renderCalendar(data, "Asia/Tokyo");
  expect(japan).toContain("9月7日 — 13日");
  expect(japan).toContain("周一放送");
  expect(japan).toContain("今天 · 2");
  expect(japan).toContain("01:00");
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

test("home calendar keeps today's birthdays ahead of other events", async () => {
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
});

test("home calendar prioritizes local-day starts and short events over long ongoing events", async () => {
  const html = await renderCalendar({
    ...catalog,
    generatedAt: "2026-09-04T16:00:00Z",
    events: [
      ["长期活动", "2026-07-01", "2026-09-30"],
      ["三日活动", "2026-09-03", "2026-09-05"],
      ["两日活动", "2026-09-04", "2026-09-05"],
      ["当地今天开始", "2026-09-05T01:00:00+09:00", "2026-09-30T18:00:00+09:00"],
      ["未来单日活动", "2026-09-06", null],
    ].map(([title, startsAt, endsAt]) => ({
      ...catalog.events[0]!,
      id: title!,
      title: title!,
      startsAt: startsAt!,
      endsAt: endsAt!,
    })),
  });
  expect(html.indexOf("当地今天开始")).toBeLessThan(html.indexOf("两日活动"));
  expect(html.indexOf("两日活动")).toBeLessThan(html.indexOf("三日活动"));
  expect(html).not.toContain("长期活动");
  expect(html).not.toContain("未来单日活动");
});
