import type { MediaWrite } from "@/domain";
import { and, eq } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { mediaItemsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { assertContentLinks } from "./content-context";
import type { ResourceAudit, ResourceChangeAudit } from "./resource-write";
import { resourceAuditSnapshot } from "./resource-audit";

export async function createMedia(
  db: D1Database,
  animeId: string,
  value: MediaWrite,
  audit: ResourceAudit,
): Promise<string> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);

  const id = createId("media");
  const orm = database(db);
  const insert = orm.insert(mediaItemsTable).values({ id, animeId, ...value });

  await orm.batch([insert, audit(id)]);

  return id;
}

export async function updateMedia(
  db: D1Database,
  animeId: string,
  id: string,
  value: MediaWrite,
  audit: ResourceChangeAudit,
): Promise<void> {
  const before = await resourceAuditSnapshot(db, animeId, "media", id);

  await assertContentLinks(db, animeId, value.personId, value.characterId);

  const orm = database(db);

  const update = orm
    .update(mediaItemsTable)
    .set(value)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.animeId, animeId)));

  const result = (await orm.batch([update, audit(before)]))[0];
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到媒体条目。");
}

export async function deleteMedia(
  db: D1Database,
  animeId: string,
  id: string,
  audit: ResourceChangeAudit,
): Promise<D1Result> {
  const before = await resourceAuditSnapshot(db, animeId, "media", id);
  const orm = database(db);

  const remove = orm
    .delete(mediaItemsTable)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.animeId, animeId)));

  return (await orm.batch([remove, audit(before)]))[0];
}
