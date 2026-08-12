import type { MediaWrite } from "@/domain";
import { and, eq } from "drizzle-orm";
import { database } from "../db/client";
import { mediaItemsTable } from "../db/schema";
import { createId, HttpError } from "../http";
import { assertContentLinks } from "./admin-content-context";

export async function createMedia(db: D1Database, animeId: string, value: MediaWrite): Promise<string> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);
  const id = createId("media");
  await database(db).insert(mediaItemsTable).values({ id, animeId, ...value }).run();
  return id;
}

export async function updateMedia(db: D1Database, animeId: string, id: string, value: MediaWrite): Promise<void> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);
  const result = await database(db).update(mediaItemsTable).set(value)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.animeId, animeId))).run();
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到媒体条目。");
}

export function deleteMedia(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  return database(db).delete(mediaItemsTable)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.animeId, animeId))).run();
}
