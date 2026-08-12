import type { CastWrite } from "@/domain";
import { and, eq } from "drizzle-orm";
import { database } from "../db/client";
import { castCreditsTable, charactersTable } from "../db/schema";
import { atomicBatch } from "../db/transaction";
import { createId, HttpError } from "../http";
import { birthdayEventStatements } from "./admin-birthday-events";
import { personForWrite, personInsert } from "./admin-resource-context";

export async function createCast(db: D1Database, animeId: string, value: CastWrite): Promise<string> {
  const personValue = {
    personId: value.personId,
    name: value.personName,
    nameNative: value.personNameNative,
    primaryKind: "cast" as const,
  };
  const person = await personForWrite(db, personValue);
  const characterId = createId("character");
  const creditId = createId("cast");
  const statements = person.create ? [personInsert(db, person.id, personValue)] : [];
  statements.push(
    db.prepare(`
      INSERT INTO characters (
        id, anime_id, name, name_native, name_source_url, profile, profile_source_url,
        portrait_url, portrait_source_url, is_main_group, birthday_month, birthday_day,
        birthday_year, birthday_timezone, birthday_source_url, birthday_verified, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      characterId, animeId, value.characterName, value.characterNameNative, value.nameSourceUrl,
      value.characterProfile, value.profileSourceUrl, value.portraitUrl, value.portraitSourceUrl,
      value.isMainGroup ? 1 : 0, value.birthdayMonth, value.birthdayDay,
      value.birthdayYear, value.birthdayTimezone, value.birthdaySourceUrl,
      value.birthdayVerified ? 1 : 0, value.sortOrder,
    ),
    db.prepare(`
      INSERT INTO cast_credits (id, anime_id, character_id, person_id, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).bind(creditId, animeId, characterId, person.id, value.sortOrder),
  );
  statements.push(...await birthdayEventStatements(db, animeId, characterId, value));
  await atomicBatch(db, statements);
  return creditId;
}

export async function updateCast(db: D1Database, animeId: string, id: string, value: CastWrite): Promise<void> {
  const row = await db.prepare("SELECT character_id, person_id FROM cast_credits WHERE id = ? AND anime_id = ?")
    .bind(id, animeId).first<{ character_id: string; person_id: string }>();
  if (!row) throw new HttpError(404, "没有找到 Cast 项。");
  await atomicBatch(db, [
    db.prepare("UPDATE people SET name = ?, name_native = ?, primary_kind = 'cast', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(value.personName, value.personNameNative, row.person_id),
    db.prepare(`
      UPDATE characters SET name = ?, name_native = ?, name_source_url = ?, profile = ?,
        profile_source_url = ?, portrait_url = ?, portrait_source_url = ?, is_main_group = ?, birthday_month = ?,
        birthday_day = ?, birthday_year = ?, birthday_timezone = ?, birthday_source_url = ?,
        birthday_verified = ?, sort_order = ? WHERE id = ? AND anime_id = ?
    `).bind(
      value.characterName, value.characterNameNative, value.nameSourceUrl, value.characterProfile,
      value.profileSourceUrl, value.portraitUrl, value.portraitSourceUrl, value.isMainGroup ? 1 : 0,
      value.birthdayMonth, value.birthdayDay, value.birthdayYear, value.birthdayTimezone,
      value.birthdaySourceUrl, value.birthdayVerified ? 1 : 0, value.sortOrder,
      row.character_id, animeId,
    ),
    db.prepare("UPDATE cast_credits SET sort_order = ? WHERE id = ? AND anime_id = ?")
      .bind(value.sortOrder, id, animeId),
    ...await birthdayEventStatements(db, animeId, row.character_id, value),
  ]);
}

export async function deleteCast(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  const credit = await database(db).select({ characterId: castCreditsTable.characterId })
    .from(castCreditsTable)
    .where(and(eq(castCreditsTable.id, id), eq(castCreditsTable.animeId, animeId)))
    .get();
  if (!credit) throw new HttpError(404, "没有找到 Cast 项。");
  return database(db).delete(charactersTable)
    .where(and(eq(charactersTable.id, credit.characterId), eq(charactersTable.animeId, animeId))).run();
}
