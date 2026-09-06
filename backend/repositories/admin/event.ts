import type { EventWrite } from "@/domain";
import { and, eq, ne } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { eventsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { assertContentLinks } from "./content-context";
import type { ResourceAudit, ResourceChangeAudit } from "./resource-write";
import { resourceAuditSnapshot } from "./resource-audit";

export async function createEvent(
  db: D1Database,
  animeId: string,
  value: EventWrite,
  audit: ResourceAudit,
): Promise<string> {
  await assertContentLinks(db, animeId, value.personId, value.characterId);

  const id = createId("event");
  const orm = database(db);
  const insert = orm.insert(eventsTable).values({ id, animeId, ...value });

  await orm.batch([insert, audit(id)]);

  return id;
}

export async function updateEvent(
  db: D1Database,
  animeId: string,
  id: string,
  value: EventWrite,
  audit: ResourceChangeAudit,
): Promise<void> {
  const before = await resourceAuditSnapshot(db, animeId, "event", id);

  await assertContentLinks(db, animeId, value.personId, value.characterId);

  const orm = database(db);

  const update = orm
    .update(eventsTable)
    .set(value)
    .where(
      and(
        eq(eventsTable.id, id),
        eq(eventsTable.animeId, animeId),
        ne(eventsTable.eventType, "birthday"),
      ),
    );

  const result = (await orm.batch([update, audit(before)]))[0];
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到可编辑事件。");
}

export async function deleteEvent(
  db: D1Database,
  animeId: string,
  id: string,
  audit: ResourceChangeAudit,
): Promise<D1Result> {
  const before = await resourceAuditSnapshot(db, animeId, "event", id);
  const orm = database(db);

  const remove = orm
    .delete(eventsTable)
    .where(
      and(
        eq(eventsTable.id, id),
        eq(eventsTable.animeId, animeId),
        ne(eventsTable.eventType, "birthday"),
      ),
    );

  return (await orm.batch([remove, audit(before)]))[0];
}
