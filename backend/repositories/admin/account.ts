import type { AccountWrite } from "@/domain";
import { eq, sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { accountsTable, researchSourcesTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { readAccountForAnime, assertAccountOwner } from "./resource-context";
import type { ResourceAudit, ResourceChangeAudit } from "./resource-write";

export async function createAccount(db: D1Database, animeId: string, value: AccountWrite, audit: ResourceAudit): Promise<string> {
  await assertAccountOwner(db, animeId, value);
  const id = createId("account");
  const orm = database(db);
  const insert = orm.insert(accountsTable).values({
    id,
    ...value,
    verifiedAt: value.verified ? new Date().toISOString() : null,
    createdAt: sql`CURRENT_TIMESTAMP`,
  });
  await orm.batch([insert, audit(id)]);
  return id;
}

export async function updateAccount(db: D1Database, animeId: string, id: string, value: AccountWrite, audit: ResourceChangeAudit): Promise<void> {
  const before = await readAccountForAnime(db, animeId, id);
  if (!before) throw new HttpError(404, "没有找到账号。");
  if (before.ownerType !== value.ownerType || before.ownerId !== value.ownerId) await assertAccountOwner(db, animeId, value);
  const orm = database(db);
  const update = orm.update(accountsTable).set({
    ...value,
    verifiedAt: value.verified ? sql`COALESCE(verified_at, CURRENT_TIMESTAMP)` : null,
  }).where(eq(accountsTable.id, id));
  await orm.batch([update, audit(before)]);
}

export async function deleteAccount(db: D1Database, animeId: string, id: string, audit: ResourceChangeAudit): Promise<D1Result> {
  const before = await readAccountForAnime(db, animeId, id);
  if (!before) throw new HttpError(404, "没有找到账号。");
  const orm = database(db);
  const results = await orm.batch([
    orm.update(researchSourcesTable).set({ accountId: null }).where(eq(researchSourcesTable.accountId, id)),
    orm.delete(accountsTable).where(eq(accountsTable.id, id)),
    audit(before),
  ]);
  return results[1];
}
