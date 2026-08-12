import type { ContentClass, Discussion, FeedResponse, MediaItem } from "@/domain";
import { mapFeed, mapMedia } from "../db/mappers";
import type { FeedRow, MediaRow } from "../db/rows";
import { decodeFeedCursor, encodeFeedCursor } from "./feed-cursor";

const FEED_SELECT = `
  SELECT fi.id, fi.anime_id, a.slug AS anime_slug, a.title_zh AS anime_title,
    a.cover_url AS anime_cover_url,
    fi.person_id, p.name AS person_name, fi.character_id, c.name AS character_name,
    fi.account_id, fi.platform_object_id,
    fi.content_class, fi.source_identity, fi.title, fi.summary, fi.url,
    fi.source_name, fi.source_account, fi.importance, fi.published_at,
    fi.safety_rating, fi.spoiler_level, fi.auto_published, fi.is_pinned,
    m.id AS media_id, m.content_class AS media_content_class, m.title AS media_title,
    m.creator_name, m.creator_url, m.original_url, m.preview_url,
    m.presentation_mode, m.safety_rating AS media_safety_rating,
    m.spoiler_level AS media_spoiler_level, m.rights_note,
    m.published_at AS media_published_at
  FROM feed_items fi
  LEFT JOIN anime a ON a.id = fi.anime_id
  LEFT JOIN people p ON p.id = fi.person_id
  LEFT JOIN characters c ON c.id = fi.character_id
  LEFT JOIN media_items m ON m.id = fi.media_id
`;

export async function readFeed(
  db: D1Database,
  options: {
    animeId?: string;
    animeSlug?: string;
    contentClasses?: ContentClass[];
    limit?: number;
    query?: string;
    cursor?: string;
  } = {},
): Promise<FeedResponse> {
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 80);
  const clauses = [
    "fi.withdrawn_at IS NULL",
    "fi.safety_rating != 'adult'",
    "fi.content_class != 'editorial'",
  ];
  const values: Array<string | number> = [];
  if (options.animeId) {
    clauses.push("fi.anime_id = ?");
    values.push(options.animeId);
  }
  if (options.animeSlug) {
    clauses.push("a.slug = ?");
    values.push(options.animeSlug);
  }
  if (options.contentClasses?.length) {
    clauses.push(`fi.content_class IN (${options.contentClasses.map(() => "?").join(", ")})`);
    values.push(...options.contentClasses);
  }
  const searchText = `LOWER(
    COALESCE(fi.title, '') || ' ' || COALESCE(fi.summary, '') || ' ' ||
    COALESCE(fi.source_name, '') || ' ' || COALESCE(fi.source_account, '') || ' ' ||
    COALESCE(a.title_zh, '') || ' ' || COALESCE(a.title_ja, '') || ' ' || COALESCE(a.title_en, '') || ' ' ||
    COALESCE(p.name, '') || ' ' || COALESCE(p.name_native, '') || ' ' ||
    COALESCE(c.name, '') || ' ' || COALESCE(c.name_native, '')
  )`;
  const tokens = options.query?.trim().split(/\s+/u).filter(Boolean).slice(0, 5) ?? [];
  for (const token of tokens) {
    clauses.push(`INSTR(${searchText}, LOWER(?)) > 0`);
    values.push(token.slice(0, 48));
  }
  if (options.cursor) {
    const cursor = decodeFeedCursor(options.cursor);
    clauses.push(`(
      fi.is_pinned < ? OR
      (fi.is_pinned = ? AND fi.published_at < ?) OR
      (fi.is_pinned = ? AND fi.published_at = ? AND fi.id < ?)
    )`);
    values.push(
      cursor.pinned,
      cursor.pinned, cursor.publishedAt,
      cursor.pinned, cursor.publishedAt, cursor.id,
    );
  }
  const statement = db.prepare(`
    ${FEED_SELECT}
    WHERE ${clauses.join(" AND ")}
    ORDER BY fi.is_pinned DESC, fi.published_at DESC, fi.id DESC LIMIT ?
  `);
  const bound = statement.bind(...values, limit + 1);
  const { results } = await bound.all<FeedRow>();
  const pageRows = results.slice(0, limit);
  const last = pageRows.at(-1);
  const nextCursor = results.length > limit && last
    ? encodeFeedCursor({ pinned: last.is_pinned ? 1 : 0, publishedAt: last.published_at, id: last.id })
    : null;
  return { items: pageRows.map(mapFeed), nextCursor };
}

export async function readMedia(db: D1Database, animeId: string): Promise<MediaItem[]> {
  const { results } = await db.prepare(`
    SELECT id, content_class, title, creator_name, creator_url, original_url,
      preview_url, presentation_mode, safety_rating, spoiler_level, rights_note, published_at
    FROM media_items WHERE anime_id = ? AND safety_rating IN ('safe', 'suggestive')
    ORDER BY published_at DESC
  `).bind(animeId).all<MediaRow>();
  return results.map(mapMedia);
}

export async function readDiscussions(db: D1Database, animeId: string): Promise<Discussion[]> {
  const { results } = await db.prepare(`
    SELECT id, platform, title, url, note, last_activity_at, last_checked_at
    FROM discussions d
    JOIN discussion_anime da ON da.discussion_id = d.id
    WHERE da.anime_id = ? AND d.is_active = 1
    ORDER BY COALESCE(d.last_activity_at, d.last_checked_at) DESC
  `).bind(animeId).all<{
    id: string;
    platform: string;
    title: string;
    url: string;
    note: string | null;
    last_activity_at: string | null;
    last_checked_at: string | null;
  }>();
  return results.map((row) => ({
    id: row.id,
    platform: row.platform,
    title: row.title,
    url: row.url,
    note: row.note,
    lastActivityAt: row.last_activity_at,
    lastCheckedAt: row.last_checked_at,
  }));
}

export { FEED_SELECT };
