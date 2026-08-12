import type { StaffWrite } from "@/domain";
import { atomicBatch } from "../db/transaction";
import { and, eq } from "drizzle-orm";
import { database } from "../db/client";
import { workCreditsTable } from "../db/schema";
import { createId, HttpError } from "../http";
import { personForWrite, personInsert } from "./admin-resource-context";

export async function createStaff(db: D1Database, animeId: string, value: StaffWrite): Promise<string> {
  const person = await personForWrite(db, value);
  const id = createId("credit");
  const statements = person.create ? [personInsert(db, person.id, value)] : [];
  statements.push(db.prepare(`
    INSERT INTO work_credits (id, anime_id, person_id, role, profile_url, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, animeId, person.id, value.role, value.profileUrl, value.sortOrder));
  await atomicBatch(db, statements);
  return id;
}

export async function updateStaff(db: D1Database, animeId: string, id: string, value: StaffWrite): Promise<void> {
  const row = await db.prepare("SELECT person_id FROM work_credits WHERE id = ? AND anime_id = ?")
    .bind(id, animeId).first<{ person_id: string }>();
  if (!row) throw new HttpError(404, "没有找到 Staff 项。");
  await atomicBatch(db, [
    db.prepare("UPDATE people SET name = ?, name_native = ?, primary_kind = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(value.name, value.nameNative, value.primaryKind, row.person_id),
    db.prepare("UPDATE work_credits SET role = ?, profile_url = ?, sort_order = ? WHERE id = ? AND anime_id = ?")
      .bind(value.role, value.profileUrl, value.sortOrder, id, animeId),
  ]);
}

export async function deleteStaff(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  return database(db).delete(workCreditsTable)
    .where(and(eq(workCreditsTable.id, id), eq(workCreditsTable.animeId, animeId))).run();
}
