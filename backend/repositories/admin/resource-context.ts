import type { AccountWrite, StaffWrite } from "@/domain";
import { and, eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { accountsTable, animeTable, castCreditsTable, peopleTable, workCreditsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

export async function assertAnime(db: D1Database, animeId: string): Promise<void> {
  const anime = await database(db).select({ id: animeTable.id }).from(animeTable)
    .where(eq(animeTable.id, animeId)).get();
  if (!anime) {
    throw new HttpError(404, "没有找到这部动画。");
  }
}

export async function personBelongsToAnime(db: D1Database, animeId: string, personId: string): Promise<boolean> {
  const orm = database(db);
  const [staff, cast] = await Promise.all([
    orm.select({ id: workCreditsTable.id }).from(workCreditsTable)
      .where(and(eq(workCreditsTable.animeId, animeId), eq(workCreditsTable.personId, personId))).get(),
    orm.select({ id: castCreditsTable.id }).from(castCreditsTable)
      .where(and(eq(castCreditsTable.animeId, animeId), eq(castCreditsTable.personId, personId))).get(),
  ]);
  return Boolean(staff || cast);
}

export async function assertAccountOwner(db: D1Database, animeId: string, value: AccountWrite): Promise<void> {
  if (value.ownerType === "anime") {
    if (value.ownerId !== animeId) throw new HttpError(400, "作品账号必须属于当前作品。");
    return;
  }
  if (!await personBelongsToAnime(db, animeId, value.ownerId)) {
    throw new HttpError(400, "账号主体不属于当前作品的 Staff 或 Cast。");
  }
}

export async function assertSourceAccount(db: D1Database, animeId: string, accountId: string | null): Promise<void> {
  if (!accountId) return;
  const account = await database(db).select({ ownerType: accountsTable.ownerType, ownerId: accountsTable.ownerId })
    .from(accountsTable).where(eq(accountsTable.id, accountId)).get();
  const belongs = account?.ownerType === "anime"
    ? account.ownerId === animeId
    : account ? await personBelongsToAnime(db, animeId, account.ownerId) : false;
  if (!belongs) throw new HttpError(400, "来源账号不属于当前作品。");
}

export async function personForWrite(
  db: D1Database,
  value: Pick<StaffWrite, "personId" | "name" | "nameNative" | "primaryKind">,
): Promise<{ id: string; create: boolean }> {
  if (value.personId) {
    const existing = await database(db).select({ id: peopleTable.id }).from(peopleTable)
      .where(eq(peopleTable.id, value.personId)).get();
    if (!existing) throw new HttpError(400, "指定人员不存在。");
    return { id: existing.id, create: false };
  }
  const existing = await database(db).select({ id: peopleTable.id }).from(peopleTable).where(and(
    eq(peopleTable.name, value.name),
    sql`COALESCE(${peopleTable.nameNative}, '') = COALESCE(${value.nameNative}, '')`,
  )).get();
  return existing ? { id: existing.id, create: false } : { id: createId("person"), create: true };
}

export function personInsert(
  db: D1Database,
  personId: string,
  value: Pick<StaffWrite, "name" | "nameNative" | "primaryKind">,
) {
  return database(db).insert(peopleTable).values({
    id: personId,
    name: value.name,
    nameNative: value.nameNative,
    primaryKind: value.primaryKind,
  });
}
