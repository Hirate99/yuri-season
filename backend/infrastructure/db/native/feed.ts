import type { ContentClass } from "@/domain";

import type { FeedRow } from "../rows";
import { allRows, placeholders } from "./statement";

type FeedCursor = { pinned: number; publishedAt: string; id: string };

export type NativeFeedFilter = {
  id?: string;
  animeId?: string;
  animeSlug?: string;
  contentClasses?: ContentClass[];
  cursor?: FeedCursor;
  limit: number;
  query?: string;
};

const PUBLIC_FEED_ITEM = "fi.withdrawn_at IS NULL";

const SEARCH_TEXT = `LOWER(
  COALESCE(thread.title, fi.title, '') || ' ' || COALESCE(fi.summary, '') || ' ' ||
  COALESCE(thread.platform, fi.source_name, '') || ' ' || COALESCE(fi.source_account, '') || ' ' ||
  COALESCE(a.title_zh, '') || ' ' || COALESCE(a.title_ja, '') || ' ' || COALESCE(a.title_en, '') || ' ' ||
  COALESCE(p.name, '') || ' ' || COALESCE(p.name_native, '') || ' ' ||
  COALESCE(c.name, '') || ' ' || COALESCE(c.name_native, '') || ' ' || COALESCE((
    SELECT GROUP_CONCAT(related.title_zh || ' ' || related.title_ja || ' ' || COALESCE(related.title_en, ''), ' ')
    FROM discussions d
    JOIN discussion_anime da ON da.discussion_id = d.id
    JOIN anime related ON related.id = da.anime_id
    WHERE fi.content_class = 'community_thread' AND d.id = fi.discussion_id
  ), '')
)`;

const FEED_SELECT = `
  SELECT fi.id, fi.anime_id, a.slug AS anime_slug, a.title_zh AS anime_title,
    a.cover_url AS anime_cover_url,
    CASE WHEN fi.content_class = 'community_thread' THEN COALESCE((
      SELECT json_group_array(json_object(
        'id', related.id, 'slug', related.slug, 'title', related.title_zh, 'coverUrl', related.cover_url
      ))
      FROM discussions d
      JOIN discussion_anime da ON da.discussion_id = d.id
      JOIN anime related ON related.id = da.anime_id
      WHERE d.id = fi.discussion_id
    ), '[]') ELSE '[]' END AS related_anime_json,
    fi.person_id, p.name AS person_name, fi.character_id, c.name AS character_name,
    fi.account_id, fi.platform_object_id, fi.content_class, fi.source_identity,
    CASE WHEN fi.content_class = 'community_thread' THEN COALESCE(thread.title, fi.title) ELSE fi.title END AS title,
    fi.summary,
    CASE WHEN fi.content_class = 'community_thread' THEN COALESCE(thread.url, fi.url) ELSE fi.url END AS url,
    CASE WHEN fi.content_class = 'community_thread' THEN COALESCE(thread.platform, fi.source_name) ELSE fi.source_name END AS source_name,
    fi.source_account, fi.importance, fi.published_at, fi.safety_rating, fi.spoiler_level,
    fi.auto_published, fi.is_pinned,
    m.id AS media_id, m.content_class AS media_content_class, m.title AS media_title,
    m.creator_name, m.creator_url, m.original_url, m.preview_url,
    (SELECT asset.r2_key FROM media_assets asset
      WHERE asset.media_id = m.id
        AND asset.status = 'active' AND asset.withdrawn_at IS NULL
        AND asset.rights_status IN ('licensed', 'press_kit', 'official_promo_reviewed')
      ORDER BY CASE asset.variant WHEN 'thumbnail' THEN 0 WHEN 'preview' THEN 1 ELSE 2 END,
        asset.width ASC, asset.id ASC
      LIMIT 1) AS media_r2_key,
    m.presentation_mode, m.safety_rating AS media_safety_rating,
    m.spoiler_level AS media_spoiler_level, m.rights_note,
    m.published_at AS media_published_at
  FROM feed_items fi
  LEFT JOIN anime a ON a.id = fi.anime_id
  LEFT JOIN people p ON p.id = fi.person_id
  LEFT JOIN characters c ON c.id = fi.character_id
  LEFT JOIN media_items m ON m.id = fi.media_id
  LEFT JOIN discussions thread ON thread.id = fi.discussion_id
`;

function buildWhere(filter: NativeFeedFilter) {
  const clauses = [PUBLIC_FEED_ITEM, "fi.safety_rating != 'adult'", "fi.content_class != 'editorial'"];
  const bindings: Array<string | number> = [];

  if (filter.id) {
    clauses.push("fi.id = ?");
    bindings.push(filter.id);
  }

  if (filter.animeId) {
    clauses.push(`(fi.anime_id = ? OR (fi.content_class = 'community_thread' AND EXISTS (
      SELECT 1 FROM discussion_anime da WHERE da.discussion_id = fi.discussion_id AND da.anime_id = ?
    )))`);
    bindings.push(filter.animeId, filter.animeId);
  }
  if (filter.animeSlug) {
    clauses.push(`(a.slug = ? OR (fi.content_class = 'community_thread' AND EXISTS (
      SELECT 1 FROM discussion_anime da JOIN anime related ON related.id = da.anime_id
      WHERE da.discussion_id = fi.discussion_id AND related.slug = ?
    )))`);
    bindings.push(filter.animeSlug, filter.animeSlug);
  }
  if (filter.contentClasses?.length) {
    clauses.push(`fi.content_class IN (${placeholders(filter.contentClasses.length)})`);
    bindings.push(...filter.contentClasses);
  }
  for (const token of filter.query?.trim().split(/\s+/u).filter(Boolean).slice(0, 5) ?? []) {
    clauses.push(`INSTR(${SEARCH_TEXT}, LOWER(?)) > 0`);
    bindings.push(token.slice(0, 48));
  }
  if (filter.cursor) {
    clauses.push(`(fi.is_pinned < ? OR
      (fi.is_pinned = ? AND fi.published_at < ?) OR
      (fi.is_pinned = ? AND fi.published_at = ? AND fi.id < ?))`);
    bindings.push(
      filter.cursor.pinned,
      filter.cursor.pinned, filter.cursor.publishedAt,
      filter.cursor.pinned, filter.cursor.publishedAt, filter.cursor.id,
    );
  }
  return { text: clauses.join(" AND "), bindings };
}

export function readNativeFeedPage(db: D1Database, filter: NativeFeedFilter): Promise<FeedRow[]> {
  const where = buildWhere(filter);
  return allRows<FeedRow>(db, `
    ${FEED_SELECT}
    WHERE ${where.text}
    ORDER BY fi.is_pinned DESC, fi.published_at DESC, fi.id DESC
    LIMIT ?
  `, [...where.bindings, filter.limit]);
}
