import type { DiscussionWrite } from "@/domain";
import { createId, HttpError } from "../http";

export async function createDiscussion(db: D1Database, animeId: string, value: DiscussionWrite): Promise<string> {
  const existing = await db.prepare("SELECT id FROM discussions WHERE url = ?")
    .bind(value.url).first<{ id: string }>();
  if (existing) {
    await db.prepare("INSERT OR IGNORE INTO discussion_anime (discussion_id, anime_id) VALUES (?, ?)")
      .bind(existing.id, animeId).run();
    return existing.id;
  }
  const id = createId("discussion");
  await db.batch([
    db.prepare(`
      INSERT INTO discussions (
        id, anime_id, platform, title, url, note, is_active, last_activity_at, last_checked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(id, animeId, value.platform, value.title, value.url, value.note, value.isActive ? 1 : 0, value.lastActivityAt),
    db.prepare("INSERT INTO discussion_anime (discussion_id, anime_id) VALUES (?, ?)").bind(id, animeId),
  ]);
  return id;
}

export async function updateDiscussion(db: D1Database, animeId: string, id: string, value: DiscussionWrite): Promise<void> {
  const result = await db.prepare(`
    UPDATE discussions SET platform = ?, title = ?, url = ?, note = ?, is_active = ?,
      last_activity_at = ?, last_checked_at = CURRENT_TIMESTAMP
    WHERE id = ? AND EXISTS (
      SELECT 1 FROM discussion_anime WHERE discussion_id = ? AND anime_id = ?
    )
  `).bind(
    value.platform, value.title, value.url, value.note, value.isActive ? 1 : 0,
    value.lastActivityAt, id, id, animeId,
  ).run();
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到讨论串。");
}

export async function deleteDiscussion(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  const [result] = await db.batch([
    db.prepare("DELETE FROM discussion_anime WHERE discussion_id = ? AND anime_id = ?").bind(id, animeId),
    db.prepare(`DELETE FROM discussions WHERE id = ? AND NOT EXISTS (
      SELECT 1 FROM discussion_anime WHERE discussion_id = ?
    )`).bind(id, id),
  ]);
  return result;
}
