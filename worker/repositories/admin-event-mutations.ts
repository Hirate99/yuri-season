import type { EventWrite } from "@/domain";
import { and, eq, ne } from "drizzle-orm";
import { database } from "../db/client";
import { eventsTable } from "../db/schema";
import { createId, HttpError } from "../http";
import { assertContentLinks } from "./admin-content-context";

export async function createEvent(db: D1Database, animeId: string, value: EventWrite): Promise<string> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);
  const id = createId("event");
  await database(db).insert(eventsTable).values({ id, animeId, ...value }).run();
  return id;
}

export async function updateEvent(db: D1Database, animeId: string, id: string, value: EventWrite): Promise<void> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);
  const result = await database(db).update(eventsTable).set(value)
    .where(and(eq(eventsTable.id, id), eq(eventsTable.animeId, animeId), ne(eventsTable.eventType, "birthday"))).run();
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到可编辑事件。");
}

export function deleteEvent(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  return database(db).delete(eventsTable)
    .where(and(eq(eventsTable.id, id), eq(eventsTable.animeId, animeId), ne(eventsTable.eventType, "birthday"))).run();
}
