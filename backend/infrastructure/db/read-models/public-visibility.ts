import { and, eq, exists, isNull, notExists, or, sql } from "drizzle-orm";

import { database } from "../client";
import {
  discussionsTable,
  feedCandidatesTable,
  feedItemsTable,
  mediaItemsTable,
} from "../schema";

/** A published Feed row remains authoritative until it is explicitly withdrawn. */
export const publicFeedItem = isNull(feedItemsTable.withdrawnAt);

/** Manual media is public immediately; candidate media requires a live publication. */
export function publicMedia(db: D1Database) {
  const orm = database(db);
  return or(
    notExists(orm.select({ value: sql<number>`1` })
      .from(feedCandidatesTable)
      .where(eq(feedCandidatesTable.mediaId, mediaItemsTable.id))),
    exists(orm.select({ value: sql<number>`1` })
      .from(feedItemsTable)
      .where(and(
        eq(feedItemsTable.mediaId, mediaItemsTable.id),
        isNull(feedItemsTable.withdrawnAt),
      ))),
  );
}

/** Manual discussions are public immediately; projected discussions follow publication state. */
export function publicDiscussion(db: D1Database) {
  const orm = database(db);
  return or(
    notExists(orm.select({ value: sql<number>`1` })
      .from(feedItemsTable)
      .where(eq(feedItemsTable.discussionId, discussionsTable.id))),
    exists(orm.select({ value: sql<number>`1` })
      .from(feedItemsTable)
      .where(and(
        eq(feedItemsTable.discussionId, discussionsTable.id),
        isNull(feedItemsTable.withdrawnAt),
      ))),
  );
}
