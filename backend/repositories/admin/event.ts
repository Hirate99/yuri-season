import type { EventWrite } from "@/domain";
import { and, eq, ne } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { eventsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { assertContentLinks } from "./content-context";
import type { ResourceAudit } from "./resource-write";

export async function createEvent(db: D1Database, animeId: string, value: EventWrite, audit?: ResourceAudit): Promise<string> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);
  const id = createId("event");
  const orm = database(db);
  const insert = orm.insert(eventsTable).values({ id, animeId, ...value });
  if (audit) await orm.batch([insert, audit(id)]); else await insert.run();
  return id;
}

export async function updateEvent(db: D1Database, animeId: string, id: string, value: EventWrite, audit?: ResourceAudit): Promise<void> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);
  const orm = database(db);
  const update = orm.update(eventsTable).set(value)
    .where(and(eq(eventsTable.id, id), eq(eventsTable.animeId, animeId), ne(eventsTable.eventType, "birthday")));
  const result = audit ? (await orm.batch([update, audit(id)]))[0] : await update.run();
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到可编辑事件。");
}

export async function deleteEvent(db: D1Database, animeId: string, id: string, audit?: ResourceAudit): Promise<D1Result> {
  const orm = database(db);
  const remove = orm.delete(eventsTable)
    .where(and(eq(eventsTable.id, id), eq(eventsTable.animeId, animeId), ne(eventsTable.eventType, "birthday")));
  return audit ? (await orm.batch([remove, audit(id)]))[0] : remove.run();
}
