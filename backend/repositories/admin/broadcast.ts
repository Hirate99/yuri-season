import type { BroadcastWrite } from "@/domain";
import { and, eq } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { broadcastSlotsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import type { ResourceAudit, ResourceChangeAudit } from "./resource-write";
import { resourceAuditSnapshot } from "./resource-audit";

export async function createBroadcast(
  db: D1Database,
  animeId: string,
  value: BroadcastWrite,
  audit: ResourceAudit,
): Promise<string> {
  const id = createId("broadcast");
  const orm = database(db);
  const insert = orm.insert(broadcastSlotsTable).values({ id, animeId, ...value });

  if (value.isPrimary) {
    await orm.batch([
      orm
        .update(broadcastSlotsTable)
        .set({ isPrimary: false })
        .where(eq(broadcastSlotsTable.animeId, animeId)),
      insert,
      audit(id),
    ]);
  } else await orm.batch([insert, audit(id)]);

  return id;
}

export async function updateBroadcast(
  db: D1Database,
  animeId: string,
  id: string,
  value: BroadcastWrite,
  audit: ResourceChangeAudit,
): Promise<void> {
  const before = await resourceAuditSnapshot(db, animeId, "broadcast", id);
  const orm = database(db);

  const update = orm
    .update(broadcastSlotsTable)
    .set(value)
    .where(and(eq(broadcastSlotsTable.id, id), eq(broadcastSlotsTable.animeId, animeId)));

  const result = value.isPrimary
    ? (
        await orm.batch([
          orm
            .update(broadcastSlotsTable)
            .set({ isPrimary: false })
            .where(eq(broadcastSlotsTable.animeId, animeId)),
          update,
          audit(before),
        ])
      )[1]
    : (await orm.batch([update, audit(before)]))[0];
  if ((result?.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到播出时间。");
}

export async function deleteBroadcast(
  db: D1Database,
  animeId: string,
  id: string,
  audit: ResourceChangeAudit,
): Promise<D1Result> {
  const before = await resourceAuditSnapshot(db, animeId, "broadcast", id);
  const orm = database(db);

  const remove = orm
    .delete(broadcastSlotsTable)
    .where(and(eq(broadcastSlotsTable.id, id), eq(broadcastSlotsTable.animeId, animeId)));

  return (await orm.batch([remove, audit(before)]))[0];
}
