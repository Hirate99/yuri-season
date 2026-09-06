import type { AdminDiscussion, AdminEvent, AdminMedia, AdminThemeSong } from "@/domain";
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { themeSongSelection } from "~/infrastructure/db/read-models/detail";
import {
  animeThemeSongsTable,
  discussionAnimeTable,
  discussionsTable,
  eventsTable,
  mediaItemsTable,
  musicTracksTable,
} from "~/infrastructure/db/schema";

export async function readAdminContentResources(db: D1Database, animeId: string): Promise<{
  events: AdminEvent[];
  media: AdminMedia[];
  discussions: AdminDiscussion[];
  themeSongs: AdminThemeSong[];
}> {
  const orm = database(db);
  const trackUsage = orm.$with("track_usage").as(orm.select({
    trackId: animeThemeSongsTable.trackId,
    sharedAnimeCount: count().as("shared_anime_count"),
  }).from(animeThemeSongsTable).groupBy(animeThemeSongsTable.trackId));
  const [events, media, discussionRows, themeSongs, discussionLinks] = await orm.batch([
    orm.select({
      id: eventsTable.id,
      personId: eventsTable.personId,
      characterId: eventsTable.characterId,
      eventType: eventsTable.eventType,
      title: eventsTable.title,
      startsAt: eventsTable.startsAt,
      endsAt: eventsTable.endsAt,
      timezone: eventsTable.timezone,
      recurrenceRule: eventsTable.recurrenceRule,
      sourceUrl: eventsTable.sourceUrl,
      verified: eventsTable.verified,
      status: eventsTable.status,
    }).from(eventsTable)
      .where(and(eq(eventsTable.animeId, animeId), ne(eventsTable.eventType, "birthday")))
      .orderBy(sql`COALESCE(${eventsTable.startsAt}, '9999-12-31')`, eventsTable.title, eventsTable.id),
    orm.select({
      id: mediaItemsTable.id,
      personId: mediaItemsTable.personId,
      characterId: mediaItemsTable.characterId,
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
    }).from(mediaItemsTable)
      .where(eq(mediaItemsTable.animeId, animeId))
      .orderBy(desc(mediaItemsTable.publishedAt), mediaItemsTable.id),
    orm.select({
      id: discussionsTable.id,
      platform: discussionsTable.platform,
      title: discussionsTable.title,
      url: discussionsTable.url,
      note: discussionsTable.note,
      isActive: discussionsTable.isActive,
      lastActivityAt: discussionsTable.lastActivityAt,
      lastCheckedAt: discussionsTable.lastCheckedAt,
    }).from(discussionsTable)
      .innerJoin(discussionAnimeTable, eq(discussionAnimeTable.discussionId, discussionsTable.id))
      .where(eq(discussionAnimeTable.animeId, animeId))
      .orderBy(
        desc(discussionsTable.isActive),
        desc(sql`COALESCE(${discussionsTable.lastActivityAt}, ${discussionsTable.lastCheckedAt})`),
        discussionsTable.id,
      ),
    orm.with(trackUsage).select({
      ...themeSongSelection,
      trackId: animeThemeSongsTable.trackId,
      verified: musicTracksTable.verified,
      sortOrder: animeThemeSongsTable.sortOrder,
      sharedAnimeCount: trackUsage.sharedAnimeCount,
    }).from(animeThemeSongsTable)
      .innerJoin(musicTracksTable, eq(musicTracksTable.id, animeThemeSongsTable.trackId))
      .innerJoin(trackUsage, eq(trackUsage.trackId, animeThemeSongsTable.trackId))
      .where(eq(animeThemeSongsTable.animeId, animeId))
      .orderBy(
        asc(animeThemeSongsTable.sortOrder),
        animeThemeSongsTable.songKind,
        animeThemeSongsTable.sequence,
        animeThemeSongsTable.id,
      ),
    orm.select({
      discussionId: discussionAnimeTable.discussionId,
      animeId: discussionAnimeTable.animeId,
    }).from(discussionAnimeTable)
      .where(inArray(discussionAnimeTable.discussionId,
        orm.select({ id: discussionAnimeTable.discussionId }).from(discussionAnimeTable)
          .where(eq(discussionAnimeTable.animeId, animeId)))),
  ]);
  const animeIdsByDiscussion = new Map<string, string[]>();
  for (const link of discussionLinks) {
    const animeIds = animeIdsByDiscussion.get(link.discussionId) ?? [];
    animeIds.push(link.animeId);
    animeIdsByDiscussion.set(link.discussionId, animeIds);
  }

  return {
    events: events.map((row) => ({ ...row, eventType: row.eventType as AdminEvent["eventType"] })),
    media,
    discussions: discussionRows.map((row) => ({
      ...row,
      animeIds: animeIdsByDiscussion.get(row.id) ?? [],
      sharedAnimeCount: animeIdsByDiscussion.get(row.id)?.length ?? 0,
    })),
    themeSongs,
  };
}
