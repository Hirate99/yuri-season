import type { SeasonWrite } from "@/domain";
import { eq, ne } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { seasonsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

import { auditInsert } from "../audit";
import type { AdminPrincipal } from "~/infrastructure/auth";

function translateSeasonConstraint(error: unknown): never {
  if (String(error).includes("UNIQUE constraint failed")) throw new HttpError(409, "季度标识已存在。");
  throw error;
}

export async function createSeason(db: D1Database, value: SeasonWrite, principal?: AdminPrincipal): Promise<string> {
  const id = createId("season");
  const orm = database(db);
  const insert = orm.insert(seasonsTable).values({ id, ...value });
  try {
    if (value.isCurrent) {
      await orm.batch([
        orm.update(seasonsTable).set({ isCurrent: false }),
        insert,
        auditInsert(db, "admin", "create_season", "season", id, { principal, after: value }),
      ]);
    } else {
      await orm.batch([insert, auditInsert(db, "admin", "create_season", "season", id, { principal, after: value })]);
    }
  } catch (error) {
    translateSeasonConstraint(error);
  }
  return id;
}

export async function updateSeason(db: D1Database, id: string, value: SeasonWrite, principal?: AdminPrincipal): Promise<void> {
  const orm = database(db);
  const existing = await orm.select({
    slug: seasonsTable.slug,
    label: seasonsTable.label,
    startsOn: seasonsTable.startsOn,
    endsOn: seasonsTable.endsOn,
    isCurrent: seasonsTable.isCurrent,
  }).from(seasonsTable).where(eq(seasonsTable.id, id)).get();
  if (!existing) throw new HttpError(404, "季度不存在。");
  if (existing.isCurrent && !value.isCurrent) throw new HttpError(400, "请先把另一个季度设为当季。");

  const update = orm.update(seasonsTable).set(value).where(eq(seasonsTable.id, id));
  const audit = auditInsert(db, "admin", "update_season", "season", id, { principal, before: existing, after: value });
  try {
    if (value.isCurrent) {
      await orm.batch([
        orm.update(seasonsTable).set({ isCurrent: false }).where(ne(seasonsTable.id, id)),
        update,
        audit,
      ]);
    } else {
      await orm.batch([update, audit]);
    }
  } catch (error) {
    translateSeasonConstraint(error);
  }
}
