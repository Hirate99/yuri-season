import type { DiscussionWrite } from "@/domain";
import { placeholders } from "../db/query";
import { atomicBatch } from "../db/transaction";
import { createId, HttpError } from "../http";
import { auditStatement } from "./audit";

function linkedAnimeIds(animeId: string, value: DiscussionWrite): string[] {
  return [...new Set([animeId, ...(value.animeIds ?? [])])];
}

async function assertAnimeLinks(db: D1Database, animeIds: string[]): Promise<void> {
  const row = await db.prepare(`
    SELECT COUNT(*) AS count FROM anime WHERE id IN (${placeholders(animeIds.length)})
  `).bind(...animeIds).first<{ count: number }>();
  if (row?.count !== animeIds.length) throw new HttpError(400, "讨论串包含不存在的作品。");
}

export async function createDiscussion(db: D1Database, animeId: string, value: DiscussionWrite): Promise<string> {
  const animeIds = linkedAnimeIds(animeId, value);
  await assertAnimeLinks(db, animeIds);
  const existing = await db.prepare("SELECT id FROM discussions WHERE url = ?")
    .bind(value.url).first<{ id: string }>();
  if (existing) {
    await atomicBatch(db, animeIds.map((linkedAnimeId) =>
      db.prepare("INSERT OR IGNORE INTO discussion_anime (discussion_id, anime_id) VALUES (?, ?)")
        .bind(existing.id, linkedAnimeId)));
    return existing.id;
  }
  const id = createId("discussion");
  await atomicBatch(db, [
    db.prepare(`
      INSERT INTO discussions (
        id, anime_id, platform, title, url, note, is_active, last_activity_at, last_checked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(id, animeId, value.platform, value.title, value.url, value.note, value.isActive ? 1 : 0, value.lastActivityAt),
    ...animeIds.map((linkedAnimeId) =>
      db.prepare("INSERT INTO discussion_anime (discussion_id, anime_id) VALUES (?, ?)")
        .bind(id, linkedAnimeId)),
  ]);
  return id;
}

export async function updateDiscussion(db: D1Database, animeId: string, id: string, value: DiscussionWrite): Promise<void> {
  const linked = await db.prepare(`
    SELECT 1 FROM discussion_anime WHERE discussion_id = ? AND anime_id = ?
  `).bind(id, animeId).first();
  if (!linked) throw new HttpError(404, "没有找到讨论串。");

  const animeIds = linkedAnimeIds(animeId, value);
  await assertAnimeLinks(db, animeIds);
  await atomicBatch(db, [
    db.prepare(`
      UPDATE discussions SET anime_id = ?, platform = ?, title = ?, url = ?, note = ?, is_active = ?,
        last_activity_at = ?, last_checked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      animeId, value.platform, value.title, value.url, value.note, value.isActive ? 1 : 0,
      value.lastActivityAt, id,
    ),
    db.prepare(`
      DELETE FROM discussion_anime
      WHERE discussion_id = ? AND anime_id NOT IN (${placeholders(animeIds.length)})
    `).bind(id, ...animeIds),
    ...animeIds.map((linkedAnimeId) =>
      db.prepare("INSERT OR IGNORE INTO discussion_anime (discussion_id, anime_id) VALUES (?, ?)")
        .bind(id, linkedAnimeId)),
  ]);
}

export async function unlinkDiscussionFromAnime(
  db: D1Database,
  animeId: string,
  id: string,
): Promise<D1Result> {
  const linked = await db.prepare(`
    SELECT 1 FROM discussion_anime WHERE discussion_id = ? AND anime_id = ?
  `).bind(id, animeId).first();
  if (!linked) throw new HttpError(404, "没有找到当前作品的讨论关联。");
  const linkCount = await db.prepare(`
    SELECT COUNT(*) AS count FROM discussion_anime WHERE discussion_id = ?
  `).bind(id).first<{ count: number }>();
  if ((linkCount?.count ?? 0) <= 1) {
    throw new HttpError(409, "这是讨论串的最后一个作品关联，请使用彻底删除。");
  }
  const [result] = await atomicBatch(db, [
    db.prepare("DELETE FROM discussion_anime WHERE discussion_id = ? AND anime_id = ?").bind(id, animeId),
    db.prepare(`
      UPDATE discussions SET anime_id = (
        SELECT anime_id FROM discussion_anime WHERE discussion_id = ? ORDER BY anime_id LIMIT 1
      )
      WHERE id = ? AND anime_id = ? AND EXISTS (
        SELECT 1 FROM discussion_anime WHERE discussion_id = ?
      )
    `).bind(id, id, animeId, id),
  ]);
  return result;
}

export async function deleteDiscussionEverywhere(
  db: D1Database,
  id: string,
  reason: string,
): Promise<void> {
  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new HttpError(400, "彻底删除需要填写原因。");
  if (normalizedReason.length > 300) throw new HttpError(400, "彻底删除原因不能超过 300 字。");
  const discussion = await db.prepare(`
    SELECT id, title, url FROM discussions WHERE id = ?
  `).bind(id).first<{ id: string; title: string; url: string }>();
  if (!discussion) throw new HttpError(404, "没有找到讨论串。");

  await atomicBatch(db, [
    db.prepare(`
      INSERT INTO corrections (
        id, feed_item_id, correction_type, reason, replacement_feed_item_id, actor_type
      )
      SELECT 'correction-discussion-delete-' || fi.id, fi.id, 'withdraw', ?, NULL, 'admin'
      FROM feed_items fi
      WHERE fi.discussion_id = ? AND fi.withdrawn_at IS NULL
    `).bind(normalizedReason, id),
    db.prepare(`
      UPDATE feed_items SET withdrawn_at = CURRENT_TIMESTAMP
      WHERE discussion_id = ? AND withdrawn_at IS NULL
    `).bind(id),
    db.prepare("UPDATE feed_items SET discussion_id = NULL WHERE discussion_id = ?").bind(id),
    db.prepare("DELETE FROM discussions WHERE id = ?").bind(id),
    auditStatement(db, "admin", "delete_discussion", "discussion", id, {
      reason: normalizedReason,
      title: discussion.title,
      url: discussion.url,
    }),
  ]);
}
