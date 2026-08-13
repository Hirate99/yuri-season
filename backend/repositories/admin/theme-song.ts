import type { ThemeSongWrite } from "@/domain";
import { and, eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { animeThemeSongsTable, musicTracksTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

async function resolveTrack(db: D1Database, value: ThemeSongWrite): Promise<string> {
  if (value.trackId) {
    const existing = await database(db).select({ id: musicTracksTable.id }).from(musicTracksTable)
      .where(eq(musicTracksTable.id, value.trackId)).get();
    if (!existing) throw new HttpError(400, "没有找到要复用的曲目。");
    return existing.id;
  }
  const orm = database(db);
  await orm.insert(musicTracksTable).values({
    id: createId("track"),
    title: value.title,
    artist: value.artist,
    lyricist: value.lyricist,
    composer: value.composer,
    arranger: value.arranger,
    officialUrl: value.officialUrl,
    sourceUrl: value.sourceUrl,
    verified: value.verified,
    coverUrl: value.coverUrl,
    coverSourceUrl: value.coverSourceUrl,
  }).onConflictDoNothing();
  const track = await orm.select({ id: musicTracksTable.id }).from(musicTracksTable).where(and(
    eq(musicTracksTable.title, value.title),
    eq(musicTracksTable.artist, value.artist),
  )).get();
  if (!track) throw new HttpError(500, "曲目写入失败。");
  await orm.update(musicTracksTable).set({
    lyricist: sql`COALESCE(${musicTracksTable.lyricist}, ${value.lyricist})`,
    composer: sql`COALESCE(${musicTracksTable.composer}, ${value.composer})`,
    arranger: sql`COALESCE(${musicTracksTable.arranger}, ${value.arranger})`,
    officialUrl: sql`COALESCE(${musicTracksTable.officialUrl}, ${value.officialUrl})`,
    sourceUrl: sql`COALESCE(${musicTracksTable.sourceUrl}, ${value.sourceUrl})`,
    coverUrl: sql`COALESCE(${musicTracksTable.coverUrl}, ${value.coverUrl})`,
    coverSourceUrl: sql`COALESCE(${musicTracksTable.coverSourceUrl}, ${value.coverSourceUrl})`,
    verified: sql`MAX(${musicTracksTable.verified}, ${value.verified ? 1 : 0})`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).where(eq(musicTracksTable.id, track.id));
  return track.id;
}

export async function createThemeSong(db: D1Database, animeId: string, value: ThemeSongWrite): Promise<string> {
  const trackId = await resolveTrack(db, value);
  const id = createId("theme-song");
  await database(db).insert(animeThemeSongsTable).values({
    id,
    animeId,
    trackId,
    songKind: value.songKind,
    sequence: value.sequence,
    episodeRange: value.episodeRange,
    sortOrder: value.sortOrder,
  });
  return id;
}

export async function upsertVerifiedThemeSongFromBatch(
  db: D1Database,
  animeId: string,
  value: ThemeSongWrite,
): Promise<{ id: string; created: boolean }> {
  const existing = await database(db).select({
    id: animeThemeSongsTable.id,
    track_id: animeThemeSongsTable.trackId,
    title: musicTracksTable.title,
    artist: musicTracksTable.artist,
  }).from(animeThemeSongsTable)
    .innerJoin(musicTracksTable, eq(musicTracksTable.id, animeThemeSongsTable.trackId))
    .where(and(
      eq(animeThemeSongsTable.animeId, animeId),
      eq(animeThemeSongsTable.songKind, value.songKind),
      eq(animeThemeSongsTable.sequence, value.sequence),
    )).get();
  if (!existing) return { id: await createThemeSong(db, animeId, value), created: true };
  if (existing.title !== value.title || existing.artist !== value.artist) {
    throw new HttpError(409, `${value.songKind.toUpperCase()}${value.sequence} 与现有曲目冲突，需要人工核对。`);
  }
  const orm = database(db);
  await orm.batch([
    orm.update(musicTracksTable).set({
      lyricist: sql`COALESCE(${musicTracksTable.lyricist}, ${value.lyricist})`,
      composer: sql`COALESCE(${musicTracksTable.composer}, ${value.composer})`,
      arranger: sql`COALESCE(${musicTracksTable.arranger}, ${value.arranger})`,
      officialUrl: sql`COALESCE(${musicTracksTable.officialUrl}, ${value.officialUrl})`,
      coverUrl: sql`COALESCE(${musicTracksTable.coverUrl}, ${value.coverUrl})`,
      coverSourceUrl: sql`COALESCE(${musicTracksTable.coverSourceUrl}, ${value.coverSourceUrl})`,
      sourceUrl: sql`COALESCE(${musicTracksTable.sourceUrl}, ${value.sourceUrl})`,
      verified: true,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(musicTracksTable.id, existing.track_id)),
    orm.update(animeThemeSongsTable).set({
      episodeRange: sql`COALESCE(${animeThemeSongsTable.episodeRange}, ${value.episodeRange})`,
      sortOrder: sql`MIN(${animeThemeSongsTable.sortOrder}, ${value.sortOrder})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(animeThemeSongsTable.id, existing.id)),
  ]);
  return { id: existing.id, created: false };
}

export async function updateThemeSong(db: D1Database, animeId: string, id: string, value: ThemeSongWrite): Promise<void> {
  const link = await database(db).select({ track_id: animeThemeSongsTable.trackId }).from(animeThemeSongsTable)
    .where(and(eq(animeThemeSongsTable.id, id), eq(animeThemeSongsTable.animeId, animeId))).get();
  if (!link) throw new HttpError(404, "没有找到主题曲资料。");
  const trackId = value.trackId ?? link.track_id;
  if (trackId !== link.track_id) await resolveTrack(db, { ...value, trackId });
  const orm = database(db);
  const results = await orm.batch([
    orm.update(animeThemeSongsTable).set({
      trackId,
      songKind: value.songKind,
      sequence: value.sequence,
      episodeRange: value.episodeRange,
      sortOrder: value.sortOrder,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(and(eq(animeThemeSongsTable.id, id), eq(animeThemeSongsTable.animeId, animeId))),
    orm.update(musicTracksTable).set({
      title: value.title,
      artist: value.artist,
      lyricist: value.lyricist,
      composer: value.composer,
      arranger: value.arranger,
      officialUrl: value.officialUrl,
      coverUrl: value.coverUrl,
      coverSourceUrl: value.coverSourceUrl,
      sourceUrl: value.sourceUrl,
      verified: value.verified,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(musicTracksTable.id, trackId)),
  ]);
  if ((results[0].meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到主题曲资料。");
}

export async function deleteThemeSong(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  const orm = database(db);
  const link = await orm.select({ track_id: animeThemeSongsTable.trackId }).from(animeThemeSongsTable)
    .where(and(eq(animeThemeSongsTable.id, id), eq(animeThemeSongsTable.animeId, animeId))).get();
  if (!link) return orm.delete(animeThemeSongsTable)
    .where(and(eq(animeThemeSongsTable.id, id), eq(animeThemeSongsTable.animeId, animeId))).run();
  const [result] = await orm.batch([
    orm.delete(animeThemeSongsTable)
      .where(and(eq(animeThemeSongsTable.id, id), eq(animeThemeSongsTable.animeId, animeId))),
    orm.delete(musicTracksTable).where(and(
      eq(musicTracksTable.id, link.track_id),
      sql`NOT EXISTS (SELECT 1 FROM anime_theme_songs WHERE track_id = ${link.track_id})`,
    )),
  ]);
  return result;
}
