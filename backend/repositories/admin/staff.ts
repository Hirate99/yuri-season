import type { StaffWrite } from "@/domain";
import { and, eq, sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { peopleTable, workCreditsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { personForWrite, personInsert } from "./resource-context";
import type { ResourceAudit } from "./resource-write";

export async function createStaff(db: D1Database, animeId: string, value: StaffWrite, audit?: ResourceAudit): Promise<string> {
  const person = await personForWrite(db, value);
  const id = createId("credit");
  const orm = database(db);
  const insertCredit = orm.insert(workCreditsTable).values({
    id,
    animeId,
    personId: person.id,
    role: value.role,
    profileUrl: value.profileUrl,
    sortOrder: value.sortOrder,
  });
  if (person.create) await orm.batch([personInsert(db, person.id, value), insertCredit, ...(audit ? [audit(id)] : [])]);
  else if (audit) await orm.batch([insertCredit, audit(id)]);
  else await insertCredit;
  return id;
}

export async function updateStaff(db: D1Database, animeId: string, id: string, value: StaffWrite, audit?: ResourceAudit): Promise<void> {
  const orm = database(db);
  const row = await orm.select({ personId: workCreditsTable.personId }).from(workCreditsTable)
    .where(and(eq(workCreditsTable.id, id), eq(workCreditsTable.animeId, animeId))).get();
  if (!row) throw new HttpError(404, "没有找到 Staff 项。");
  await orm.batch([
    orm.update(peopleTable).set({
      name: value.name,
      nameNative: value.nameNative,
      primaryKind: value.primaryKind,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(peopleTable.id, row.personId)),
    orm.update(workCreditsTable).set({
      role: value.role,
      profileUrl: value.profileUrl,
      sortOrder: value.sortOrder,
    }).where(and(eq(workCreditsTable.id, id), eq(workCreditsTable.animeId, animeId))),
    ...(audit ? [audit(id)] : []),
  ]);
}

export async function deleteStaff(db: D1Database, animeId: string, id: string, audit?: ResourceAudit): Promise<D1Result> {
  const orm = database(db);
  const remove = orm.delete(workCreditsTable)
    .where(and(eq(workCreditsTable.id, id), eq(workCreditsTable.animeId, animeId)));
  return audit ? (await orm.batch([remove, audit(id)]))[0] : remove.run();
}
