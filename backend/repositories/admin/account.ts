import type { AccountWrite } from "@/domain";
import { eq, sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { accountsTable, researchSourcesTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { assertAccountOwner, personBelongsToAnime } from "./resource-context";

async function assertVisibleAccount(db: D1Database, animeId: string, id: string): Promise<void> {
  const account = await database(db).select({ ownerType: accountsTable.ownerType, ownerId: accountsTable.ownerId })
    .from(accountsTable).where(eq(accountsTable.id, id)).get();
  const visible = account?.ownerType === "anime"
    ? account.ownerId === animeId
    : account ? await personBelongsToAnime(db, animeId, account.ownerId) : false;
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
  const orm = database(db);
  const results = await orm.batch([
    orm.update(researchSourcesTable).set({ accountId: null }).where(eq(researchSourcesTable.accountId, id)),
    orm.delete(accountsTable).where(eq(accountsTable.id, id)),
  ]);
  return results[1];
}
