import type { AccountWrite } from "@/domain";
import { eq, sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { accountsTable, researchSourcesTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { accountBelongsToAnime, assertAccountOwner } from "./resource-context";
import type { ResourceAudit } from "./resource-write";

async function assertVisibleAccount(db: D1Database, animeId: string, id: string): Promise<void> {
  if (!await accountBelongsToAnime(db, animeId, id)) throw new HttpError(404, "没有找到账号。");
}

export async function createAccount(db: D1Database, animeId: string, value: AccountWrite, audit?: ResourceAudit): Promise<string> {
  await assertAccountOwner(db, animeId, value);
  const id = createId("account");
  const orm = database(db);
  const insert = orm.insert(accountsTable).values({
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
  });
  if (audit) await orm.batch([insert, audit(id)]); else await insert.run();
  return id;
}

export async function updateAccount(db: D1Database, animeId: string, id: string, value: AccountWrite, audit?: ResourceAudit): Promise<void> {
  await Promise.all([assertAccountOwner(db, animeId, value), assertVisibleAccount(db, animeId, id)]);
  const orm = database(db);
  const update = orm.update(accountsTable).set({
    ownerType: value.ownerType,
    ownerId: value.ownerId,
    platform: value.platform,
    handle: value.handle,
    url: value.url,
    verified: value.verified,
    monitorMode: value.monitorMode,
    verificationSourceUrl: value.verificationSourceUrl,
    verifiedAt: value.verified ? sql`COALESCE(verified_at, CURRENT_TIMESTAMP)` : null,
  }).where(eq(accountsTable.id, id));
  if (audit) await orm.batch([update, audit(id)]); else await update.run();
}

export async function deleteAccount(db: D1Database, animeId: string, id: string, audit?: ResourceAudit): Promise<D1Result> {
  await assertVisibleAccount(db, animeId, id);
  const orm = database(db);
  const results = await orm.batch([
    orm.update(researchSourcesTable).set({ accountId: null }).where(eq(researchSourcesTable.accountId, id)),
    orm.delete(accountsTable).where(eq(accountsTable.id, id)),
    ...(audit ? [audit(id)] : []),
  ]);
  return results[1];
}
