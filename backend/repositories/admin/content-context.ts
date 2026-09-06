import { and, eq } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { charactersTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { personBelongsToAnime } from "./resource-context";

export async function assertContentLinks(
  db: D1Database,
  animeId: string,
  personId: string | null,
  characterId: string | null,
): Promise<void> {
  const [person, character] = await Promise.all([
    personId ? personBelongsToAnime(db, animeId, personId) : Promise.resolve(true),
    characterId
      ? database(db)
          .select({ id: charactersTable.id })
          .from(charactersTable)
          .where(and(eq(charactersTable.id, characterId), eq(charactersTable.animeId, animeId)))
          .get()
      : Promise.resolve(true),
  ]);
  if (!person) throw new HttpError(400, "关联人物不属于当前作品。");
  if (!character) throw new HttpError(400, "关联角色不属于当前作品。");
}
