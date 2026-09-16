import type { ContentClass, Discussion, FeedResponse, MediaItem } from "@/domain";
import { and, desc, eq, inArray } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { mapFeed } from "~/infrastructure/db/mappers";
import { readNativeFeedPage } from "~/infrastructure/db/native/feed";
import { publicDiscussion, publicMedia } from "~/infrastructure/db/read-models/public-visibility";
import {
  discussionAnimeTable,
  discussionsTable,
  mediaItemsTable,
} from "~/infrastructure/db/schema";
import { decodeFeedCursor, encodeFeedCursor } from "./feed-cursor";
import { canonicalInstant } from "~/shared/time";
import { readPublicationAssetGroups, readPublicationDocuments } from "./publications";
import { decodeSubscriptionCursor, encodeSubscriptionCursor } from "./subscription-cursor";

const subscriptionPageSize = 100;

// Leave room for visibility predicates under D1's 100-parameter limit.
async function readBatches<T>(ids: string[], read: (ids: string[]) => Promise<Map<string, T>>) {
  const batches = [];
  for (let offset = 0; offset < ids.length; offset += 80) {
    batches.push(read(ids.slice(offset, offset + 80)));
  }
  return new Map((await Promise.all(batches)).flatMap((batch) => [...batch]));
}

/** Backfilled news is ordered by site publication time, independently of website pinning. */
export async function readSubscriptionFeed(
  db: D1Database,
  options: Omit<FeedOptions, "limit"> = {},
) {
  const results = await readNativeFeedPage(db, {
    ...options,
    order: "created",
    cursor: options.cursor === undefined ? undefined : decodeSubscriptionCursor(options.cursor),
    limit: subscriptionPageSize + 1,
  });
  const rows = results.slice(0, subscriptionPageSize);
  const last = rows.at(-1);
  const nextCursor =
    results.length > subscriptionPageSize && last
      ? encodeSubscriptionCursor({ createdAt: last.created_at_sort, id: last.id })
      : null;
  const mediaIds = [...new Set(rows.flatMap((row) => (row.media_id ? [row.media_id] : [])))];
  const [documents, assets] = await Promise.all([
    readBatches(
      rows.map((row) => row.id),
      (ids) => readPublicationDocuments(db, ids),
    ),
    readBatches(mediaIds, (ids) => readPublicationAssetGroups(db, ids)),
  ]);
  return {
    nextCursor,
    entries: rows.map((row) => ({
      item: mapFeed(row),
      createdAt: row.created_at,
      document: documents.get(row.id) ?? null,
      assets: row.media_id ? (assets.get(row.media_id) ?? []) : [],
    })),
  };
}

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

  const nextCursor =
    results.length > limit && last
      ? encodeFeedCursor({
          pinned: last.is_pinned ? 1 : 0,
          publishedAt: last.published_at,
          id: last.id,
        })
      : null;

  return { items: pageRows.map(mapFeed), nextCursor };
}

export async function readFeedItem(db: D1Database, id: string) {
  const rows = await readNativeFeedPage(db, { id, limit: 1 });

  return rows[0] ? mapFeed(rows[0]) : null;
}

export async function readMedia(db: D1Database, animeId: string): Promise<MediaItem[]> {
  const rows = await database(db)
    .select({
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
    })
    .from(mediaItemsTable)
    .where(
      and(
        eq(mediaItemsTable.animeId, animeId),
        inArray(mediaItemsTable.safetyRating, ["safe", "suggestive"]),
        publicMedia(db),
      ),
    )
    .orderBy(desc(mediaItemsTable.publishedAt));

  return rows.map((row) => ({
    ...row,
    publishedAt: canonicalInstant(row.publishedAt),
  })) as MediaItem[];
}

export async function readDiscussions(db: D1Database, animeId: string): Promise<Discussion[]> {
  return database(db)
    .select({
      id: discussionsTable.id,
      platform: discussionsTable.platform,
      title: discussionsTable.title,
      url: discussionsTable.url,
      note: discussionsTable.note,
      lastActivityAt: discussionsTable.lastActivityAt,
      lastCheckedAt: discussionsTable.lastCheckedAt,
    })
    .from(discussionsTable)
    .innerJoin(discussionAnimeTable, eq(discussionAnimeTable.discussionId, discussionsTable.id))
    .where(
      and(
        eq(discussionAnimeTable.animeId, animeId),
        eq(discussionsTable.isActive, true),
        publicDiscussion(db),
      ),
    )
    .orderBy(desc(discussionsTable.lastActivityAt), desc(discussionsTable.lastCheckedAt));
}
