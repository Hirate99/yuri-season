import { z } from "zod";

import { parseWithSchema } from "@worker/api/schema";
import { HttpError } from "@worker/http";
import {
  readCalendar,
  readCalendarForSeason,
  readCatalog,
  readCatalogForSeason,
  readSeasons,
} from "@worker/repositories/catalog";
import { readAnimeDetail } from "@worker/repositories/detail";
import { readDiscussions, readFeed, readMedia } from "@worker/repositories/feed";
import type { ApiApp } from "./api-shared";
import { cachedPublicData, cachedPublicJson, publicJson } from "./api-shared";

const cacheKeyPart = (value: string) => encodeURIComponent(value.toLowerCase());

const contentClassSchema = z.enum([
  "schedule", "official_news", "official_art", "creator_art", "birthday",
  "cast_post", "staff_post", "fanwork", "community_thread",
]);

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(80).default(40),
  q: z.string().max(120).optional(),
  anime: z.string().max(100).optional(),
  cursor: z.string().max(500).optional(),
  classes: z.string().max(500).default("").transform((value) => value.split(",")
    .flatMap((item) => {
      const result = contentClassSchema.safeParse(item);
      return result.success ? [result.data] : [];
    })),
});

export function registerPublicRoutes(api: ApiApp): void {
  api.get("/api/health", (context) => context.json({ ok: true, now: new Date().toISOString() }));

  api.get("/api/catalog", (context) =>
    cachedPublicJson(context, "catalog", 300, () => readCatalog(context.env.DB)));
  api.get("/api/calendar", (context) =>
    cachedPublicJson(context, "calendar", 120, () => readCalendar(context.env.DB)));
  api.get("/api/seasons", (context) =>
    cachedPublicJson(context, "seasons", 900, () => readSeasons(context.env.DB)));
  api.get("/api/seasons/:slug", (context) => {
    const slug = context.req.param("slug");
    return cachedPublicJson(context, `season:${cacheKeyPart(slug)}`, 300, () =>
      readCatalogForSeason(context.env.DB, slug));
  });
  api.get("/api/seasons/:slug/calendar", (context) => {
    const slug = context.req.param("slug");
    return cachedPublicJson(context, `season-calendar:${cacheKeyPart(slug)}`, 120, () =>
      readCalendarForSeason(context.env.DB, slug));
  });

  api.get("/api/feed", async (context) => {
    const query = parseWithSchema(feedQuerySchema, context.req.query());
    return publicJson(context, await readFeed(context.env.DB, {
      limit: query.limit,
      query: query.q,
      animeSlug: query.anime,
      contentClasses: query.classes,
      cursor: query.cursor,
    }));
  });

  api.get("/api/anime/:slug", async (context) => {
    const slug = context.req.param("slug");
    const detail = await cachedPublicData(context, `anime:${cacheKeyPart(slug)}`, 180, async () => {
      const anime = await readAnimeDetail(context.env.DB, slug);
      if (!anime) throw new HttpError(404, "没有找到这部动画。");
      const [media, discussions] = await Promise.all([
        readMedia(context.env.DB, anime.id),
        readDiscussions(context.env.DB, anime.id),
      ]);
      return { anime, media, discussions };
    });
    const feed = await readFeed(context.env.DB, { animeId: detail.anime.id, limit: 40 });
    return publicJson(context, {
      anime: detail.anime,
      feed: feed.items,
      media: detail.media,
      discussions: detail.discussions,
    });
  });
}
