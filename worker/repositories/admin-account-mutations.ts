import type { AccountWrite } from "@/domain";
import { eq, sql } from "drizzle-orm";
import { database } from "../db/client";
import { accountsTable } from "../db/schema";
import { createId, HttpError } from "../http";
import { assertAccountOwner } from "./admin-resource-context";

async function assertVisibleAccount(db: D1Database, animeId: string, id: string): Promise<void> {
  const visible = await db.prepare(`
    SELECT id FROM accounts WHERE id = ? AND (
      (owner_type = 'anime' AND owner_id = ?)
      OR owner_id IN (
        SELECT person_id FROM work_credits WHERE anime_id = ?
        UNION SELECT person_id FROM cast_credits WHERE anime_id = ?
      )
    )
  `).bind(id, animeId, animeId, animeId).first();
  if (!visible) throw new HttpError(404, "没有找到账号。");
}

export async function createAccount(db: D1Database, animeId: string, value: AccountWrite): Promise<string> {
  await assertAccountOwner(db, animeId, value);
  const id = createId("account");
  await database(db).insert(accountsTable).values({
    id,
    ownerType: value.ownerType,
    ownerId: value.ownerId,
    platform: value.platform,
    handle: value.handle,
    url: value.url,
    verified: value.verified,
    monitorMode: value.monitorMode,
    verificationSourceUrl: value.verificationSourceUrl,
    verifiedAt: value.verified ? new Date().toISOString() : null,
    createdAt: sql`CURRENT_TIMESTAMP`,
  }).run();
  return id;
}

export async function updateAccount(db: D1Database, animeId: string, id: string, value: AccountWrite): Promise<void> {
  await Promise.all([assertAccountOwner(db, animeId, value), assertVisibleAccount(db, animeId, id)]);
  await database(db).update(accountsTable).set({
    ownerType: value.ownerType,
    ownerId: value.ownerId,
    platform: value.platform,
    handle: value.handle,
    url: value.url,
    verified: value.verified,
    monitorMode: value.monitorMode,
    verificationSourceUrl: value.verificationSourceUrl,
    verifiedAt: value.verified ? sql`COALESCE(verified_at, CURRENT_TIMESTAMP)` : null,
  }).where(eq(accountsTable.id, id)).run();
}

export async function deleteAccount(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  await assertVisibleAccount(db, animeId, id);
  const results = await db.batch([
    db.prepare("UPDATE research_sources SET account_id = NULL WHERE account_id = ?").bind(id),
    db.prepare("DELETE FROM accounts WHERE id = ?").bind(id),
  ]);
  return results[1];
}
