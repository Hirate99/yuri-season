import type { BroadcastWrite } from "@/domain";
import { and, eq } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { broadcastSlotsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

export async function createBroadcast(db: D1Database, animeId: string, value: BroadcastWrite): Promise<string> {
  const id = createId("broadcast");
  const orm = database(db);
  const insert = orm.insert(broadcastSlotsTable).values({ id, animeId, ...value });
  if (value.isPrimary) {
    await orm.batch([
      orm.update(broadcastSlotsTable).set({ isPrimary: false }).where(eq(broadcastSlotsTable.animeId, animeId)),
      insert,
    ]);
  } else {
    await insert;
  }
  return id;
}

export async function updateBroadcast(db: D1Database, animeId: string, id: string, value: BroadcastWrite): Promise<void> {
  const orm = database(db);
  const update = orm.update(broadcastSlotsTable).set(value)
    .where(and(eq(broadcastSlotsTable.id, id), eq(broadcastSlotsTable.animeId, animeId)));
  const result = value.isPrimary
    ? (await orm.batch([
        orm.update(broadcastSlotsTable).set({ isPrimary: false }).where(eq(broadcastSlotsTable.animeId, animeId)),
        update,
      ])).at(-1)
    : await update.run();
  if ((result?.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到播出时间。");
}

export async function deleteBroadcast(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  return database(db).delete(broadcastSlotsTable)
    .where(and(eq(broadcastSlotsTable.id, id), eq(broadcastSlotsTable.animeId, animeId))).run();
}
