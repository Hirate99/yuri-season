import type { BroadcastWrite } from "@/domain";
import { and, eq } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { broadcastSlotsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import type { ResourceAudit } from "./resource-write";

export async function createBroadcast(db: D1Database, animeId: string, value: BroadcastWrite, audit?: ResourceAudit): Promise<string> {
  const id = createId("broadcast");
  const orm = database(db);
  const insert = orm.insert(broadcastSlotsTable).values({ id, animeId, ...value });
  if (value.isPrimary) {
    await orm.batch([
      orm.update(broadcastSlotsTable).set({ isPrimary: false }).where(eq(broadcastSlotsTable.animeId, animeId)),
      insert,
      ...(audit ? [audit(id)] : []),
    ]);
  } else if (audit) await orm.batch([insert, audit(id)]);
  else await insert;
  return id;
}

export async function updateBroadcast(db: D1Database, animeId: string, id: string, value: BroadcastWrite, audit?: ResourceAudit): Promise<void> {
  const orm = database(db);
  const update = orm.update(broadcastSlotsTable).set(value)
    .where(and(eq(broadcastSlotsTable.id, id), eq(broadcastSlotsTable.animeId, animeId)));
  const result = value.isPrimary
    ? (await orm.batch([
        orm.update(broadcastSlotsTable).set({ isPrimary: false }).where(eq(broadcastSlotsTable.animeId, animeId)),
        update,
        ...(audit ? [audit(id)] : []),
      ]))[1]
    : audit ? (await orm.batch([update, audit(id)]))[0] : await update.run();
  if ((result?.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到播出时间。");
}

export async function deleteBroadcast(db: D1Database, animeId: string, id: string, audit?: ResourceAudit): Promise<D1Result> {
  const orm = database(db);
  const remove = orm.delete(broadcastSlotsTable)
    .where(and(eq(broadcastSlotsTable.id, id), eq(broadcastSlotsTable.animeId, animeId)));
  return audit ? (await orm.batch([remove, audit(id)]))[0] : remove.run();
}
