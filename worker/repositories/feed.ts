import type { ContentClass, Discussion, FeedResponse, MediaItem } from "@/domain";
import { and, desc, eq, inArray } from "drizzle-orm";
import { database } from "../db/client";
import { mapFeed } from "../db/mappers";
import { allRows, placeholders } from "../db/query";
import { discussionsQuery, feedPageQuery, mapDiscussion } from "../db/queries/feed";
import { mediaItemsTable } from "../db/schema";
import { decodeFeedCursor, encodeFeedCursor } from "./feed-cursor";

type FeedOptions = {
  animeId?: string;
  animeSlug?: string;
  contentClasses?: ContentClass[];
  limit?: number;
  query?: string;
  cursor?: string;
};

const SEARCH_TEXT = `LOWER(
  COALESCE(fi.title, '') || ' ' || COALESCE(fi.summary, '') || ' ' ||
  COALESCE(fi.source_name, '') || ' ' || COALESCE(fi.source_account, '') || ' ' ||
  COALESCE(a.title_zh, '') || ' ' || COALESCE(a.title_ja, '') || ' ' || COALESCE(a.title_en, '') || ' ' ||
  COALESCE(p.name, '') || ' ' || COALESCE(p.name_native, '') || ' ' ||
  COALESCE(c.name, '') || ' ' || COALESCE(c.name_native, '')
  || ' ' || COALESCE((
    SELECT GROUP_CONCAT(related.title_zh || ' ' || related.title_ja || ' ' || COALESCE(related.title_en, ''), ' ')
    FROM discussions d
    JOIN discussion_anime da ON da.discussion_id = d.id
    JOIN anime related ON related.id = da.anime_id
    WHERE fi.content_class = 'community_thread' AND d.url = fi.url
  ), '')
)`;

function buildFeedFilter(options: FeedOptions): { where: string; bindings: Array<string | number> } {
  const clauses = [
    "fi.withdrawn_at IS NULL",
    "fi.safety_rating != 'adult'",
    "fi.content_class != 'editorial'",
  ];
  const bindings: Array<string | number> = [];

  if (options.animeId) {
    clauses.push(`(fi.anime_id = ? OR (
      fi.content_class = 'community_thread' AND EXISTS (
        SELECT 1 FROM discussions d
        JOIN discussion_anime da ON da.discussion_id = d.id
        WHERE d.url = fi.url AND da.anime_id = ?
      )
    ))`);
    bindings.push(options.animeId);
    bindings.push(options.animeId);
  }
  if (options.animeSlug) {
    clauses.push(`(a.slug = ? OR (
      fi.content_class = 'community_thread' AND EXISTS (
        SELECT 1 FROM discussions d
        JOIN discussion_anime da ON da.discussion_id = d.id
        JOIN anime related ON related.id = da.anime_id
        WHERE d.url = fi.url AND related.slug = ?
      )
    ))`);
    bindings.push(options.animeSlug);
    bindings.push(options.animeSlug);
  }
  if (options.contentClasses?.length) {
    clauses.push(`fi.content_class IN (${placeholders(options.contentClasses.length)})`);
    bindings.push(...options.contentClasses);
  }

  const tokens = options.query?.trim().split(/\s+/u).filter(Boolean).slice(0, 5) ?? [];
  for (const token of tokens) {
    clauses.push(`INSTR(${SEARCH_TEXT}, LOWER(?)) > 0`);
    bindings.push(token.slice(0, 48));
  }

  if (options.cursor) {
    const cursor = decodeFeedCursor(options.cursor);
    clauses.push(`(
      fi.is_pinned < ? OR
      (fi.is_pinned = ? AND fi.published_at < ?) OR
      (fi.is_pinned = ? AND fi.published_at = ? AND fi.id < ?)
    )`);
    bindings.push(
      cursor.pinned,
      cursor.pinned, cursor.publishedAt,
      cursor.pinned, cursor.publishedAt, cursor.id,
    );
  }

  return { where: clauses.join(" AND "), bindings };
}

export async function readFeed(db: D1Database, options: FeedOptions = {}): Promise<FeedResponse> {
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 80);
  const filter = buildFeedFilter(options);
  const results = await allRows(db, feedPageQuery(filter.where), [...filter.bindings, limit + 1]);
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
  }).from(mediaItemsTable).where(and(
    eq(mediaItemsTable.animeId, animeId),
    inArray(mediaItemsTable.safetyRating, ["safe", "suggestive"]),
  )).orderBy(desc(mediaItemsTable.publishedAt));
}

export async function readDiscussions(db: D1Database, animeId: string): Promise<Discussion[]> {
  return (await allRows(db, discussionsQuery, [animeId])).map(mapDiscussion);
}
