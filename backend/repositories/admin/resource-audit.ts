import { and, eq, ne } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { HttpError } from "~/shared/http-error";
import {
  broadcastSlotsTable,
  discussionAnimeTable,
  discussionsTable,
  eventsTable,
  mediaItemsTable,
  researchSourcesTable,
  workCreditsTable,
} from "~/infrastructure/db/schema";

const tables = {
  broadcast: broadcastSlotsTable,
  staff: workCreditsTable,
  source: researchSourcesTable,
  event: eventsTable,
  media: mediaItemsTable,
};

export async function resourceAuditSnapshot(
  db: D1Database,
  animeId: string,
  kind: keyof typeof tables | "discussion",
  id: string,
) {
  const orm = database(db);
  let before: Record<string, unknown> | undefined;

  if (kind === "discussion") {
    before = await orm
      .select()
      .from(discussionsTable)
      .innerJoin(discussionAnimeTable, eq(discussionAnimeTable.discussionId, discussionsTable.id))
      .where(and(eq(discussionsTable.id, id), eq(discussionAnimeTable.animeId, animeId)))
      .get();
  } else {
    const table = tables[kind];

    before = await orm
      .select()
      .from(table)
      .where(
        and(
          eq(table.id, id),
          eq(table.animeId, animeId),
          kind === "event" ? ne(eventsTable.eventType, "birthday") : undefined,
        ),
      )
      .get();
  }

  if (!before) throw new HttpError(404, "没有找到资源。");

  return before;
}
