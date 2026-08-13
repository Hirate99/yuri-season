import type { AdminDiscussion, AdminEvent, AdminMedia, AdminThemeSong } from "@/domain";
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
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
  const [events, media, discussionRows, themeSongRows] = await Promise.all([
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
    orm.select({
      id: animeThemeSongsTable.id,
      trackId: animeThemeSongsTable.trackId,
      songKind: animeThemeSongsTable.songKind,
      sequence: animeThemeSongsTable.sequence,
      title: musicTracksTable.title,
      artist: musicTracksTable.artist,
      lyricist: musicTracksTable.lyricist,
      composer: musicTracksTable.composer,
      arranger: musicTracksTable.arranger,
      episodeRange: animeThemeSongsTable.episodeRange,
      officialUrl: musicTracksTable.officialUrl,
      coverUrl: musicTracksTable.coverUrl,
      coverSourceUrl: musicTracksTable.coverSourceUrl,
      sourceUrl: musicTracksTable.sourceUrl,
      verified: musicTracksTable.verified,
      sortOrder: animeThemeSongsTable.sortOrder,
    }).from(animeThemeSongsTable)
      .innerJoin(musicTracksTable, eq(musicTracksTable.id, animeThemeSongsTable.trackId))
      .where(eq(animeThemeSongsTable.animeId, animeId))
      .orderBy(
        asc(animeThemeSongsTable.sortOrder),
        animeThemeSongsTable.songKind,
        animeThemeSongsTable.sequence,
        animeThemeSongsTable.id,
      ),
  ]);

  const [discussionLinks, themeCounts] = await Promise.all([
    discussionRows.length === 0 ? Promise.resolve([]) : orm.select({
      discussionId: discussionAnimeTable.discussionId,
      animeId: discussionAnimeTable.animeId,
    }).from(discussionAnimeTable)
      .where(inArray(discussionAnimeTable.discussionId, discussionRows.map(({ id }) => id))),
    themeSongRows.length === 0 ? Promise.resolve([]) : orm.select({
      trackId: animeThemeSongsTable.trackId,
      count: count(),
    }).from(animeThemeSongsTable)
      .where(inArray(animeThemeSongsTable.trackId, themeSongRows.map(({ trackId }) => trackId)))
      .groupBy(animeThemeSongsTable.trackId),
  ]);
  const animeIdsByDiscussion = new Map<string, string[]>();
  for (const link of discussionLinks) {
    const animeIds = animeIdsByDiscussion.get(link.discussionId) ?? [];
    animeIds.push(link.animeId);
    animeIdsByDiscussion.set(link.discussionId, animeIds);
  }
  const themeCountByTrack = new Map(themeCounts.map((row) => [row.trackId, row.count]));

  return {
    events: events.map((row) => ({ ...row, eventType: row.eventType as AdminEvent["eventType"] })),
    media,
    discussions: discussionRows.map((row) => ({
      ...row,
      animeIds: animeIdsByDiscussion.get(row.id) ?? [],
      sharedAnimeCount: animeIdsByDiscussion.get(row.id)?.length ?? 0,
    })),
    themeSongs: themeSongRows.map((row) => ({
      ...row,
      sharedAnimeCount: themeCountByTrack.get(row.trackId) ?? 0,
    })),
  };
}
