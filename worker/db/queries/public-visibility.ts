/**
 * Public projections have two origins: manually managed resources and reviewed
 * candidates. Once a Feed row exists, its withdrawal state is the publication
 * authority; candidate workflow status is deliberately not consulted here.
 *
 * Keep these predicates shared so Feed, work details, and Admin counts cannot
 * drift into different interpretations of "public".
 */
export const PUBLIC_FEED_ITEM_PREDICATE = `
  fi.withdrawn_at IS NULL
`;

export const PUBLIC_MEDIA_PREDICATE = `
  NOT EXISTS (SELECT 1 FROM feed_candidates fc WHERE fc.media_id = m.id)
  OR EXISTS (
    SELECT 1 FROM feed_items fi
    WHERE fi.media_id = m.id AND fi.withdrawn_at IS NULL
  )
`;

export const PUBLIC_DISCUSSION_PREDICATE = `
  NOT EXISTS (
    SELECT 1 FROM feed_items fi
    WHERE fi.discussion_id = d.id
  )
  OR EXISTS (
    SELECT 1 FROM feed_items fi
    WHERE fi.discussion_id = d.id AND fi.withdrawn_at IS NULL
  )
`;
