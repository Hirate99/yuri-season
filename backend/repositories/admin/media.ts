import type { MediaWrite } from "@/domain";
import { and, eq } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { mediaItemsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { assertContentLinks } from "./content-context";
import type { ResourceAudit } from "./resource-write";

export async function createMedia(db: D1Database, animeId: string, value: MediaWrite, audit?: ResourceAudit): Promise<string> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);
  const id = createId("media");
  const orm = database(db);
  const insert = orm.insert(mediaItemsTable).values({ id, animeId, ...value });
  if (audit) await orm.batch([insert, audit(id)]); else await insert.run();
  return id;
}

export async function updateMedia(db: D1Database, animeId: string, id: string, value: MediaWrite, audit?: ResourceAudit): Promise<void> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);
  const orm = database(db);
  const update = orm.update(mediaItemsTable).set(value)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.animeId, animeId)));
  const result = audit ? (await orm.batch([update, audit(id)]))[0] : await update.run();
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到媒体条目。");
}

export async function deleteMedia(db: D1Database, animeId: string, id: string, audit?: ResourceAudit): Promise<D1Result> {
  const orm = database(db);
  const remove = orm.delete(mediaItemsTable)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.animeId, animeId)));
  return audit ? (await orm.batch([remove, audit(id)]))[0] : remove.run();
}
