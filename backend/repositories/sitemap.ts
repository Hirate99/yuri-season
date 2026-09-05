import { and, asc, ne } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { publicFeedItem } from "~/infrastructure/db/read-models/public-visibility";
import { animeTable, feedItemsTable, seasonsTable } from "~/infrastructure/db/schema";

/** Read only URL identifiers, with the same visibility rules as public details. */
export async function readSitemapPaths(db: D1Database): Promise<string[]> {
  const orm = database(db);
  const [seasons, anime, publications] = await Promise.all([
    orm.select({ slug: seasonsTable.slug }).from(seasonsTable).orderBy(asc(seasonsTable.slug)),
    orm.select({ slug: animeTable.slug }).from(animeTable).orderBy(asc(animeTable.slug)),
    orm.select({ id: feedItemsTable.id }).from(feedItemsTable).where(and(
      publicFeedItem,
      ne(feedItemsTable.safetyRating, "adult"),
      ne(feedItemsTable.contentClass, "editorial"),
    )).orderBy(asc(feedItemsTable.id)),
  ]);
  return [
    "/", "/seasons", "/calendar", "/feed",
    ...seasons.map(({ slug }) => `/season/${encodeURIComponent(slug)}`),
    ...anime.map(({ slug }) => `/anime/${encodeURIComponent(slug)}`),
    ...publications.map(({ id }) => `/updates/${encodeURIComponent(id)}`),
  ];
}
