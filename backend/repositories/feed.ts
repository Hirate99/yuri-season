import type { ContentClass, Discussion, FeedResponse, MediaItem } from "@/domain";
import { and, desc, eq, inArray } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { mapFeed } from "~/infrastructure/db/mappers";
import { readNativeFeedPage } from "~/infrastructure/db/native/feed";
import { publicDiscussion, publicMedia } from "~/infrastructure/db/read-models/public-visibility";
import { discussionAnimeTable, discussionsTable, mediaItemsTable } from "~/infrastructure/db/schema";
import { decodeFeedCursor, encodeFeedCursor } from "./feed-cursor";

export type FeedOptions = {
  animeId?: string;
  animeSlug?: string;
  contentClasses?: ContentClass[];
  limit?: number;
  query?: string;
  cursor?: string;
};

export async function readFeed(db: D1Database, options: FeedOptions = {}): Promise<FeedResponse> {
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 80);
  const results = await readNativeFeedPage(db, {
    ...options,
    cursor: options.cursor ? decodeFeedCursor(options.cursor) : undefined,
    limit: limit + 1,
  });
  const pageRows = results.slice(0, limit);
  const last = pageRows.at(-1);
  const nextCursor = results.length > limit && last
    ? encodeFeedCursor({ pinned: last.is_pinned ? 1 : 0, publishedAt: last.published_at, id: last.id })
    : null;
  return { items: pageRows.map(mapFeed), nextCursor };
}

export async function readMedia(db: D1Database, animeId: string): Promise<MediaItem[]> {
  return database(db).select({
    id: mediaItemsTable.id,
    contentClass: mediaItemsTable.contentClass,
    title: mediaItemsTable.title,
    creatorName: mediaItemsTable.creatorName,
    creatorUrl: mediaItemsTable.creatorUrl,
    originalUrl: mediaItemsTable.originalUrl,
    previewUrl: mediaItemsTable.previewUrl,
    presentationMode: mediaItemsTable.presentationMode,
    safetyRating: mediaItemsTable.safetyRating,
    spoilerLevel: mediaItemsTable.spoilerLevel,
    rightsNote: mediaItemsTable.rightsNote,
    publishedAt: mediaItemsTable.publishedAt,
  }).from(mediaItemsTable)
    .where(and(
      eq(mediaItemsTable.animeId, animeId),
      inArray(mediaItemsTable.safetyRating, ["safe", "suggestive"]),
      publicMedia(db),
    ))
    .orderBy(desc(mediaItemsTable.publishedAt)) as Promise<MediaItem[]>;
}

export async function readDiscussions(db: D1Database, animeId: string): Promise<Discussion[]> {
  return database(db).select({
    id: discussionsTable.id,
    platform: discussionsTable.platform,
    title: discussionsTable.title,
    url: discussionsTable.url,
    note: discussionsTable.note,
    lastActivityAt: discussionsTable.lastActivityAt,
    lastCheckedAt: discussionsTable.lastCheckedAt,
  }).from(discussionsTable)
    .innerJoin(discussionAnimeTable, eq(discussionAnimeTable.discussionId, discussionsTable.id))
    .where(and(
      eq(discussionAnimeTable.animeId, animeId),
      eq(discussionsTable.isActive, true),
      publicDiscussion(db),
    ))
    .orderBy(desc(discussionsTable.lastActivityAt), desc(discussionsTable.lastCheckedAt));
}
