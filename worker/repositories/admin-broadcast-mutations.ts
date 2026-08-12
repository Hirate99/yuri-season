import type { BroadcastWrite } from "@/domain";
import { and, eq } from "drizzle-orm";
import { database } from "../db/client";
import { broadcastSlotsTable } from "../db/schema";
import { createId, HttpError } from "../http";

export async function createBroadcast(db: D1Database, animeId: string, value: BroadcastWrite): Promise<string> {
  const id = createId("broadcast");
  const statements = [];
  if (value.isPrimary) statements.push(db.prepare("UPDATE broadcast_slots SET is_primary = 0 WHERE anime_id = ?").bind(animeId));
  statements.push(db.prepare(`
    INSERT INTO broadcast_slots (id, anime_id, label, weekday, local_time, timezone, platform_url, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, animeId, value.label, value.weekday, value.localTime, value.timezone, value.platformUrl, value.isPrimary ? 1 : 0));
  await db.batch(statements);
  return id;
}

export async function updateBroadcast(db: D1Database, animeId: string, id: string, value: BroadcastWrite): Promise<void> {
  const statements = [];
  if (value.isPrimary) statements.push(db.prepare("UPDATE broadcast_slots SET is_primary = 0 WHERE anime_id = ?").bind(animeId));
  statements.push(db.prepare(`
    UPDATE broadcast_slots SET label = ?, weekday = ?, local_time = ?, timezone = ?,
      platform_url = ?, is_primary = ? WHERE id = ? AND anime_id = ?
  `).bind(value.label, value.weekday, value.localTime, value.timezone, value.platformUrl, value.isPrimary ? 1 : 0, id, animeId));
  const results = await db.batch(statements);
  if ((results.at(-1)?.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到播出时间。");
}

export async function deleteBroadcast(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  return database(db).delete(broadcastSlotsTable)
    .where(and(eq(broadcastSlotsTable.id, id), eq(broadcastSlotsTable.animeId, animeId))).run();
}
