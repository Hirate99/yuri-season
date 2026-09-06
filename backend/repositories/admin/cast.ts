import type { CastWrite } from "@/domain";
import type { BatchItem } from "drizzle-orm/batch";
import { and, eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { castCreditsTable, charactersTable, peopleTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

import { birthdayEventQueries } from "./birthday-events";
import { personForWrite, personInsert } from "./resource-context";
import type { ResourceAudit, ResourceChangeAudit } from "./resource-write";

export async function createCast(
  db: D1Database,
  animeId: string,
  value: CastWrite,
  audit: ResourceAudit,
): Promise<string> {
  const personValue = {
    personId: value.personId,
    name: value.personName,
    nameNative: value.personNameNative,
    primaryKind: "cast" as const,
  };

  const person = await personForWrite(db, personValue);
  const characterId = createId("character");
  const creditId = createId("cast");
  const orm = database(db);
  const queries: BatchItem<"sqlite">[] = [];
  if (person.create) queries.push(personInsert(db, person.id, personValue));

  queries.push(
    orm.insert(charactersTable).values({
      id: characterId,
      animeId,
      name: value.characterName,
      nameNative: value.characterNameNative,
      nameSourceUrl: value.nameSourceUrl,
      profile: value.characterProfile,
      profileSourceUrl: value.profileSourceUrl,
      portraitUrl: value.portraitUrl,
      portraitSourceUrl: value.portraitSourceUrl,
      isMainGroup: value.isMainGroup,
      birthdayMonth: value.birthdayMonth,
      birthdayDay: value.birthdayDay,
      birthdayYear: value.birthdayYear,
      birthdayTimezone: value.birthdayTimezone,
      birthdaySourceUrl: value.birthdaySourceUrl,
      birthdayVerified: value.birthdayVerified,
      sortOrder: value.sortOrder,
    }),
    orm.insert(castCreditsTable).values({
      id: creditId,
      animeId,
      characterId,
      personId: person.id,
      sortOrder: value.sortOrder,
    }),
    ...(await birthdayEventQueries(db, animeId, characterId, value)),
  );
  queries.push(audit(creditId));
  await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);

  return creditId;
}

export async function updateCast(
  db: D1Database,
  animeId: string,
  id: string,
  value: CastWrite,
  audit: ResourceChangeAudit,
): Promise<void> {
  const orm = database(db);

  const before = await orm
    .select()
    .from(castCreditsTable)
    .innerJoin(charactersTable, eq(charactersTable.id, castCreditsTable.characterId))
    .where(and(eq(castCreditsTable.id, id), eq(castCreditsTable.animeId, animeId)))
    .get();
  if (!before) throw new HttpError(404, "没有找到 Cast 项。");

  const queries: BatchItem<"sqlite">[] = [
    orm
      .update(peopleTable)
      .set({
        name: value.personName,
        nameNative: value.personNameNative,
        primaryKind: "cast",
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(peopleTable.id, before.cast_credits.personId)),
    orm
      .update(charactersTable)
      .set({
        name: value.characterName,
        nameNative: value.characterNameNative,
        nameSourceUrl: value.nameSourceUrl,
        profile: value.characterProfile,
        profileSourceUrl: value.profileSourceUrl,
        portraitUrl: value.portraitUrl,
        portraitSourceUrl: value.portraitSourceUrl,
        isMainGroup: value.isMainGroup,
        birthdayMonth: value.birthdayMonth,
        birthdayDay: value.birthdayDay,
        birthdayYear: value.birthdayYear,
        birthdayTimezone: value.birthdayTimezone,
        birthdaySourceUrl: value.birthdaySourceUrl,
        birthdayVerified: value.birthdayVerified,
        sortOrder: value.sortOrder,
      })
      .where(
        and(
          eq(charactersTable.id, before.cast_credits.characterId),
          eq(charactersTable.animeId, animeId),
        ),
      ),
    orm
      .update(castCreditsTable)
      .set({ sortOrder: value.sortOrder })
      .where(and(eq(castCreditsTable.id, id), eq(castCreditsTable.animeId, animeId))),
    ...(await birthdayEventQueries(db, animeId, before.cast_credits.characterId, value)),
  ];

  queries.push(audit(before));
  await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

export async function deleteCast(
  db: D1Database,
  animeId: string,
  id: string,
  audit: ResourceChangeAudit,
): Promise<D1Result> {
  const orm = database(db);

  const before = await orm
    .select()
    .from(castCreditsTable)
    .innerJoin(charactersTable, eq(charactersTable.id, castCreditsTable.characterId))
    .where(and(eq(castCreditsTable.id, id), eq(castCreditsTable.animeId, animeId)))
    .get();
  if (!before) throw new HttpError(404, "没有找到 Cast 项。");

  const remove = orm
    .delete(charactersTable)
    .where(
      and(
        eq(charactersTable.id, before.cast_credits.characterId),
        eq(charactersTable.animeId, animeId),
      ),
    );

  return (await orm.batch([remove, audit(before)]))[0];
}
