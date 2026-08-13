import type { AdminResourceKind } from "@/domain";
import { and, eq } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import {
  accountsTable,
  animeThemeSongsTable,
  broadcastSlotsTable,
  castCreditsTable,
  charactersTable,
  discussionAnimeTable,
  discussionsTable,
  eventsTable,
  mediaItemsTable,
  musicTracksTable,
  researchSourcesTable,
  workCreditsTable,
} from "~/infrastructure/db/schema";

export async function resourceAuditSnapshot(
  db: D1Database,
  animeId: string,
  kind: AdminResourceKind,
  id: string,
): Promise<Record<string, unknown> | null> {
  const orm = database(db);
  switch (kind) {
    case "account":
      return await orm.select().from(accountsTable).where(eq(accountsTable.id, id)).get() ?? null;
    case "discussion":
      return await orm.select().from(discussionsTable)
        .innerJoin(discussionAnimeTable, eq(discussionAnimeTable.discussionId, discussionsTable.id))
        .where(and(eq(discussionsTable.id, id), eq(discussionAnimeTable.animeId, animeId))).get() ?? null;
    case "theme_song":
      return await orm.select().from(animeThemeSongsTable)
        .innerJoin(musicTracksTable, eq(musicTracksTable.id, animeThemeSongsTable.trackId))
        .where(and(eq(animeThemeSongsTable.id, id), eq(animeThemeSongsTable.animeId, animeId))).get() ?? null;
    case "cast":
      return await orm.select().from(castCreditsTable)
        .innerJoin(charactersTable, eq(charactersTable.id, castCreditsTable.characterId))
        .where(and(eq(castCreditsTable.id, id), eq(castCreditsTable.animeId, animeId))).get() ?? null;
    case "broadcast":
      return await orm.select().from(broadcastSlotsTable)
        .where(and(eq(broadcastSlotsTable.id, id), eq(broadcastSlotsTable.animeId, animeId))).get() ?? null;
    case "staff":
      return await orm.select().from(workCreditsTable)
        .where(and(eq(workCreditsTable.id, id), eq(workCreditsTable.animeId, animeId))).get() ?? null;
    case "source":
      return await orm.select().from(researchSourcesTable)
        .where(and(eq(researchSourcesTable.id, id), eq(researchSourcesTable.animeId, animeId))).get() ?? null;
    case "event":
      return await orm.select().from(eventsTable)
        .where(and(eq(eventsTable.id, id), eq(eventsTable.animeId, animeId))).get() ?? null;
    case "media":
      return await orm.select().from(mediaItemsTable)
        .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.animeId, animeId))).get() ?? null;
  }
}
