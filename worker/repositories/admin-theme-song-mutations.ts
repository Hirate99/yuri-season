import type { ThemeSongWrite } from "@/domain";
import { atomicBatch } from "../db/transaction";
import { createId, HttpError } from "../http";

type ThemeLink = { track_id: string };

async function resolveTrack(db: D1Database, value: ThemeSongWrite): Promise<string> {
  if (value.trackId) {
    const existing = await db.prepare("SELECT id FROM music_tracks WHERE id = ?")
      .bind(value.trackId).first<{ id: string }>();
    if (!existing) throw new HttpError(400, "没有找到要复用的曲目。");
    return existing.id;
  }
  await db.prepare(`
    INSERT OR IGNORE INTO music_tracks (
      id, title, artist, lyricist, composer, arranger, official_url, source_url, verified
      , cover_url, cover_source_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    createId("track"), value.title, value.artist, value.lyricist, value.composer,
    value.arranger, value.officialUrl, value.sourceUrl, value.verified ? 1 : 0,
    value.coverUrl, value.coverSourceUrl,
  ).run();
  const track = await db.prepare("SELECT id FROM music_tracks WHERE title = ? AND artist = ?")
    .bind(value.title, value.artist).first<{ id: string }>();
  if (!track) throw new HttpError(500, "曲目写入失败。");
  await db.prepare(`
    UPDATE music_tracks SET
      lyricist = COALESCE(lyricist, ?), composer = COALESCE(composer, ?),
      arranger = COALESCE(arranger, ?), official_url = COALESCE(official_url, ?),
      source_url = COALESCE(source_url, ?), cover_url = COALESCE(cover_url, ?),
      cover_source_url = COALESCE(cover_source_url, ?), verified = MAX(verified, ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    value.lyricist, value.composer, value.arranger, value.officialUrl,
    value.sourceUrl, value.coverUrl, value.coverSourceUrl, value.verified ? 1 : 0, track.id,
  ).run();
  return track.id;
}

export async function createThemeSong(db: D1Database, animeId: string, value: ThemeSongWrite): Promise<string> {
  const trackId = await resolveTrack(db, value);
  const id = createId("theme-song");
  await db.prepare(`
    INSERT INTO anime_theme_songs (
      id, anime_id, track_id, song_kind, sequence, episode_range, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, animeId, trackId, value.songKind, value.sequence, value.episodeRange, value.sortOrder).run();
  return id;
}

export async function upsertVerifiedThemeSongFromBatch(
  db: D1Database,
  animeId: string,
  value: ThemeSongWrite,
): Promise<{ id: string; created: boolean }> {
  const existing = await db.prepare(`
    SELECT ats.id, ats.track_id, mt.title, mt.artist
    FROM anime_theme_songs ats JOIN music_tracks mt ON mt.id = ats.track_id
    WHERE ats.anime_id = ? AND ats.song_kind = ? AND ats.sequence = ?
  `).bind(animeId, value.songKind, value.sequence).first<{
    id: string; track_id: string; title: string; artist: string;
  }>();
  if (!existing) return { id: await createThemeSong(db, animeId, value), created: true };
  if (existing.title !== value.title || existing.artist !== value.artist) {
    throw new HttpError(409, `${value.songKind.toUpperCase()}${value.sequence} 与现有曲目冲突，需要人工核对。`);
  }
  await atomicBatch(db, [
    db.prepare(`
      UPDATE music_tracks SET lyricist = COALESCE(lyricist, ?), composer = COALESCE(composer, ?),
        arranger = COALESCE(arranger, ?), official_url = COALESCE(official_url, ?),
        cover_url = COALESCE(cover_url, ?), cover_source_url = COALESCE(cover_source_url, ?),
        source_url = COALESCE(source_url, ?), verified = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      value.lyricist, value.composer, value.arranger, value.officialUrl,
      value.coverUrl, value.coverSourceUrl, value.sourceUrl, existing.track_id,
    ),
    db.prepare(`
      UPDATE anime_theme_songs SET episode_range = COALESCE(episode_range, ?),
        sort_order = MIN(sort_order, ?), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(value.episodeRange, value.sortOrder, existing.id),
  ]);
  return { id: existing.id, created: false };
}

export async function updateThemeSong(db: D1Database, animeId: string, id: string, value: ThemeSongWrite): Promise<void> {
  const link = await db.prepare("SELECT track_id FROM anime_theme_songs WHERE id = ? AND anime_id = ?")
    .bind(id, animeId).first<ThemeLink>();
  if (!link) throw new HttpError(404, "没有找到主题曲资料。");
  const trackId = value.trackId ?? link.track_id;
  if (trackId !== link.track_id) await resolveTrack(db, { ...value, trackId });
  const results = await atomicBatch(db, [
    db.prepare(`
      UPDATE anime_theme_songs SET track_id = ?, song_kind = ?, sequence = ?,
        episode_range = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND anime_id = ?
    `).bind(trackId, value.songKind, value.sequence, value.episodeRange, value.sortOrder, id, animeId),
    db.prepare(`
      UPDATE music_tracks SET title = ?, artist = ?, lyricist = ?, composer = ?, arranger = ?,
        official_url = ?, cover_url = ?, cover_source_url = ?, source_url = ?, verified = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      value.title, value.artist, value.lyricist, value.composer, value.arranger,
      value.officialUrl, value.coverUrl, value.coverSourceUrl, value.sourceUrl, value.verified ? 1 : 0, trackId,
    ),
  ]);
  if ((results[0].meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到主题曲资料。");
}

export async function deleteThemeSong(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  const link = await db.prepare("SELECT track_id FROM anime_theme_songs WHERE id = ? AND anime_id = ?")
    .bind(id, animeId).first<ThemeLink>();
  if (!link) return db.prepare("DELETE FROM anime_theme_songs WHERE id = ? AND anime_id = ?").bind(id, animeId).run();
  const [result] = await atomicBatch(db, [
    db.prepare("DELETE FROM anime_theme_songs WHERE id = ? AND anime_id = ?").bind(id, animeId),
    db.prepare(`DELETE FROM music_tracks WHERE id = ? AND NOT EXISTS (
      SELECT 1 FROM anime_theme_songs WHERE track_id = ?
    )`).bind(link.track_id, link.track_id),
  ]);
  return result;
}
