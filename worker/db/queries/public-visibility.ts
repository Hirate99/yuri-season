/**
 * Public projections have two origins:
 * - manually managed rows, which have no candidate relationship;
 * - reviewed candidate rows, which are visible only while published and active.
 *
 * Keep these predicates shared so Feed, work details, and Admin counts cannot
 * drift into different interpretations of "published".
 */
export const PUBLIC_FEED_ITEM_PREDICATE = `
  fi.withdrawn_at IS NULL
  AND (fi.candidate_id IS NULL OR fc.status = 'published')
`;

export const PUBLIC_MEDIA_PREDICATE = `
  NOT EXISTS (SELECT 1 FROM feed_candidates fc WHERE fc.media_id = m.id)
  OR EXISTS (
    SELECT 1 FROM feed_candidates fc
    JOIN feed_items fi ON fi.candidate_id = fc.id
    WHERE fc.media_id = m.id AND fc.status = 'published' AND fi.withdrawn_at IS NULL
  )
`;

export const PUBLIC_DISCUSSION_PREDICATE = `
  NOT EXISTS (
    SELECT 1 FROM feed_items fi
    WHERE fi.url = d.url AND fi.candidate_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM feed_items fi
    JOIN feed_candidates fc ON fc.id = fi.candidate_id
    WHERE fi.url = d.url AND fi.withdrawn_at IS NULL AND fc.status = 'published'
  )
`;
