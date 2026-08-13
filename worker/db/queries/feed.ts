import type { Discussion } from "@/domain";
import type { FeedRow, MediaRow } from "../rows";
import { defineQuery } from "../query";
import { PUBLIC_DISCUSSION_PREDICATE, PUBLIC_MEDIA_PREDICATE } from "./public-visibility";

export const FEED_SELECT = `
  SELECT fi.id, fi.anime_id, a.slug AS anime_slug, a.title_zh AS anime_title,
    a.cover_url AS anime_cover_url,
    CASE WHEN fi.content_class = 'community_thread' THEN COALESCE((
      SELECT json_group_array(json_object(
        'id', related.id, 'slug', related.slug, 'title', related.title_zh, 'coverUrl', related.cover_url
      ))
      FROM discussions d
      JOIN discussion_anime da ON da.discussion_id = d.id
      JOIN anime related ON related.id = da.anime_id
      WHERE d.url = fi.url
    ), '[]') ELSE '[]' END AS related_anime_json,
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
  LEFT JOIN feed_candidates fc ON fc.id = fi.candidate_id
`;

export function feedPageQuery(where: string) {
  return defineQuery<FeedRow>(`
    ${FEED_SELECT}
    WHERE ${where}
    ORDER BY fi.is_pinned DESC, fi.published_at DESC, fi.id DESC
    LIMIT ?
  `);
}

export type DiscussionRow = {
  id: string;
  platform: string;
  title: string;
  url: string;
  note: string | null;
  last_activity_at: string | null;
  last_checked_at: string | null;
};

export const mediaQuery = defineQuery<MediaRow>(`
  SELECT m.id, m.content_class, m.title, m.creator_name, m.creator_url,
    m.original_url, m.preview_url, m.presentation_mode, m.safety_rating,
    m.spoiler_level, m.rights_note, m.published_at
  FROM media_items m
  WHERE m.anime_id = ?
    AND m.safety_rating IN ('safe', 'suggestive')
    AND (${PUBLIC_MEDIA_PREDICATE})
  ORDER BY m.published_at DESC
`);

export const discussionsQuery = defineQuery<DiscussionRow>(`
  SELECT d.id, d.platform, d.title, d.url, d.note, d.last_activity_at, d.last_checked_at
  FROM discussions d
  JOIN discussion_anime da ON da.discussion_id = d.id
  WHERE da.anime_id = ? AND d.is_active = 1
    AND (${PUBLIC_DISCUSSION_PREDICATE})
  ORDER BY COALESCE(d.last_activity_at, d.last_checked_at) DESC
`);

export function mapDiscussion(row: DiscussionRow): Discussion {
  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    url: row.url,
    note: row.note,
    lastActivityAt: row.last_activity_at,
    lastCheckedAt: row.last_checked_at,
  };
}
