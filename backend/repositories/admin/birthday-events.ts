import type { CastWrite } from "@/domain";
import { and, eq } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { animeTable, eventsTable, seasonsTable } from "~/infrastructure/db/schema";
import { createId } from "~/shared/id";

function validDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function birthdayOccurrence(startsOn: string, month: number, day: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startsOn);
  if (!match) throw new Error(`Invalid season start date: ${startsOn}`);

  const startYear = Number(match[1]);
  const startMonth = Number(match[2]);
  const startDay = Number(match[3]);
  let year = startYear + (month < startMonth || (month === startMonth && day < startDay) ? 1 : 0);

  while (!validDate(year, month, day)) year += 1;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function seasonStart(db: D1Database, animeId: string): Promise<string> {
  const row = await database(db)
    .select({ startsOn: seasonsTable.startsOn })
    .from(animeTable)
    .innerJoin(seasonsTable, eq(seasonsTable.id, animeTable.seasonId))
    .where(eq(animeTable.id, animeId))
    .get();
  if (!row) throw new Error(`Anime ${animeId} has no season`);

  return row.startsOn;
}

export async function birthdayEventQueries(
  db: D1Database,
  animeId: string,
  characterId: string,
  value: CastWrite,
) {
  const orm = database(db);

  const remove = orm
    .delete(eventsTable)
    .where(
      and(
        eq(eventsTable.animeId, animeId),
        eq(eventsTable.characterId, characterId),
        eq(eventsTable.eventType, "birthday"),
      ),
    );

  if (
    !value.birthdayVerified ||
    value.birthdayMonth === null ||
    value.birthdayDay === null ||
    !value.birthdaySourceUrl
  ) {
    return [remove] as const;
  }

  const startsAt = birthdayOccurrence(
    await seasonStart(db, animeId),
    value.birthdayMonth,
    value.birthdayDay,
  );

  const insert = orm.insert(eventsTable).values({
    id: createId("birthday"),
    animeId,
    personId: null,
    characterId,
    eventType: "birthday",
    title: `${value.characterName}生日`,
    startsAt,
    endsAt: null,
    timezone: value.birthdayTimezone,
    recurrenceRule: "FREQ=YEARLY",
    sourceUrl: value.birthdaySourceUrl,
    verified: true,
    status: "scheduled",
  });

  return [remove, insert] as const;
}
