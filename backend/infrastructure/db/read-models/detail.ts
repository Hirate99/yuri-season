import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { database } from "../client";
import {
  animeThemeSongsTable,
  broadcastSlotsTable,
  castCreditsTable,
  charactersTable,
  musicTracksTable,
  peopleTable,
  researchSourcesTable,
  workCreditsTable,
} from "../schema";

export const broadcastSelection = {
  id: broadcastSlotsTable.id,
  label: broadcastSlotsTable.label,
  weekday: broadcastSlotsTable.weekday,
  localTime: broadcastSlotsTable.localTime,
  timezone: broadcastSlotsTable.timezone,
  platformUrl: broadcastSlotsTable.platformUrl,
  isPrimary: broadcastSlotsTable.isPrimary,
};

export function readBroadcasts(db: D1Database, animeId: string) {
  return database(db).select(broadcastSelection).from(broadcastSlotsTable)
    .where(eq(broadcastSlotsTable.animeId, animeId))
    .orderBy(
      desc(broadcastSlotsTable.isPrimary),
      asc(broadcastSlotsTable.weekday),
      asc(broadcastSlotsTable.localTime),
    );
}

export const staffSelection = {
  id: workCreditsTable.id,
  personId: workCreditsTable.personId,
  role: workCreditsTable.role,
  name: peopleTable.name,
  nameNative: peopleTable.nameNative,
  profileUrl: workCreditsTable.profileUrl,
};

export function readStaff(db: D1Database, animeId: string) {
  return database(db).select(staffSelection).from(workCreditsTable)
    .innerJoin(peopleTable, eq(peopleTable.id, workCreditsTable.personId))
    .where(eq(workCreditsTable.animeId, animeId))
    .orderBy(asc(workCreditsTable.sortOrder), asc(workCreditsTable.id));
}

export const castSelection = {
  id: castCreditsTable.id,
  characterId: castCreditsTable.characterId,
  personId: castCreditsTable.personId,
  characterName: sql<string>`${charactersTable.name}`.as("character_name"),
  characterNameNative: sql<string | null>`${charactersTable.nameNative}`.as("character_name_native"),
  nameSourceUrl: charactersTable.nameSourceUrl,
  characterProfile: charactersTable.profile,
  profileSourceUrl: charactersTable.profileSourceUrl,
  portraitUrl: charactersTable.portraitUrl,
  portraitSourceUrl: charactersTable.portraitSourceUrl,
  personName: peopleTable.name,
  personNameNative: peopleTable.nameNative,
  birthdayMonth: charactersTable.birthdayMonth,
  birthdayDay: charactersTable.birthdayDay,
  birthdayVerified: charactersTable.birthdayVerified,
};

export function readCast(db: D1Database, animeId: string) {
  return database(db).select(castSelection).from(castCreditsTable)
    .innerJoin(charactersTable, eq(charactersTable.id, castCreditsTable.characterId))
    .innerJoin(peopleTable, eq(peopleTable.id, castCreditsTable.personId))
    .where(and(
      eq(castCreditsTable.animeId, animeId),
      eq(charactersTable.isMainGroup, true),
    ))
    .orderBy(asc(castCreditsTable.sortOrder), asc(castCreditsTable.id));
}

export function readSources(db: D1Database, animeId: string) {
  return database(db).select({
    id: researchSourcesTable.id,
    label: researchSourcesTable.label,
    url: researchSourcesTable.url,
    trustLevel: researchSourcesTable.trustLevel,
    lastCheckedAt: researchSourcesTable.lastCheckedAt,
  }).from(researchSourcesTable)
    .where(and(
      eq(researchSourcesTable.animeId, animeId),
      eq(researchSourcesTable.enabled, true),
    ))
    .orderBy(
      sql`CASE ${researchSourcesTable.trustLevel}
        WHEN 'official' THEN 0
        WHEN 'verified_creator' THEN 1
        WHEN 'community' THEN 2
        ELSE 3
      END`,
      asc(researchSourcesTable.label),
      asc(researchSourcesTable.id),
    );
}

export const themeSongSelection = {
  id: animeThemeSongsTable.id,
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
};

export function readThemeSongs(db: D1Database, animeId: string) {
  return database(db).select(themeSongSelection).from(animeThemeSongsTable)
    .innerJoin(musicTracksTable, eq(musicTracksTable.id, animeThemeSongsTable.trackId))
    .where(and(
      eq(animeThemeSongsTable.animeId, animeId),
      eq(musicTracksTable.verified, true),
      isNotNull(musicTracksTable.sourceUrl),
    ))
    .orderBy(
      asc(animeThemeSongsTable.sortOrder),
      asc(animeThemeSongsTable.songKind),
      asc(animeThemeSongsTable.sequence),
      asc(animeThemeSongsTable.id),
    );
}
