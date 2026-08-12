import { HttpError } from "../http";

export async function assertContentLinks(
  db: D1Database,
  animeId: string,
  personId: string | null,
  characterId: string | null,
): Promise<void> {
  const [person, character] = await Promise.all([
    personId ? db.prepare(`
      SELECT p.id FROM people p WHERE p.id = ? AND (
        EXISTS (SELECT 1 FROM work_credits wc WHERE wc.anime_id = ? AND wc.person_id = p.id)
        OR EXISTS (SELECT 1 FROM cast_credits cc WHERE cc.anime_id = ? AND cc.person_id = p.id)
      )
    `).bind(personId, animeId, animeId).first() : Promise.resolve(true),
    characterId ? db.prepare("SELECT id FROM characters WHERE id = ? AND anime_id = ?")
      .bind(characterId, animeId).first() : Promise.resolve(true),
  ]);
  if (!person) throw new HttpError(400, "关联人物不属于当前作品。");
  if (!character) throw new HttpError(400, "关联角色不属于当前作品。");
}
