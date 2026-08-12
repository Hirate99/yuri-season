import type { AccountWrite, StaffWrite } from "@/domain";
import { createId, HttpError } from "../http";

export async function assertAnime(db: D1Database, animeId: string): Promise<void> {
  if (!await db.prepare("SELECT id FROM anime WHERE id = ?").bind(animeId).first()) {
    throw new HttpError(404, "没有找到这部动画。");
  }
}

export async function assertAccountOwner(db: D1Database, animeId: string, value: AccountWrite): Promise<void> {
  if (value.ownerType === "anime") {
    if (value.ownerId !== animeId) throw new HttpError(400, "作品账号必须属于当前作品。");
    return;
  }
  const person = await db.prepare(`
    SELECT p.id FROM people p WHERE p.id = ? AND (
      EXISTS (SELECT 1 FROM work_credits wc WHERE wc.anime_id = ? AND wc.person_id = p.id)
      OR EXISTS (SELECT 1 FROM cast_credits cc WHERE cc.anime_id = ? AND cc.person_id = p.id)
    )
  `).bind(value.ownerId, animeId, animeId).first();
  if (!person) throw new HttpError(400, "账号主体不属于当前作品的 Staff 或 Cast。");
}

export async function assertSourceAccount(db: D1Database, animeId: string, accountId: string | null): Promise<void> {
  if (!accountId) return;
  const account = await db.prepare(`
    SELECT ac.id FROM accounts ac WHERE ac.id = ? AND (
      (ac.owner_type = 'anime' AND ac.owner_id = ?)
      OR (ac.owner_type IN ('person', 'organization') AND (
        EXISTS (SELECT 1 FROM work_credits wc WHERE wc.anime_id = ? AND wc.person_id = ac.owner_id)
        OR EXISTS (SELECT 1 FROM cast_credits cc WHERE cc.anime_id = ? AND cc.person_id = ac.owner_id)
      ))
    )
  `).bind(accountId, animeId, animeId, animeId).first();
  if (!account) throw new HttpError(400, "来源账号不属于当前作品。");
}

export async function personForWrite(
  db: D1Database,
  value: Pick<StaffWrite, "personId" | "name" | "nameNative" | "primaryKind">,
): Promise<{ id: string; create: boolean }> {
  if (value.personId) {
    const existing = await db.prepare("SELECT id FROM people WHERE id = ?").bind(value.personId).first<{ id: string }>();
    if (!existing) throw new HttpError(400, "指定人员不存在。");
    return { id: existing.id, create: false };
  }
  const existing = await db.prepare(`
    SELECT id FROM people WHERE name = ? AND COALESCE(name_native, '') = COALESCE(?, '') LIMIT 1
  `).bind(value.name, value.nameNative).first<{ id: string }>();
  return existing ? { id: existing.id, create: false } : { id: createId("person"), create: true };
}

export function personInsert(
  db: D1Database,
  personId: string,
  value: Pick<StaffWrite, "name" | "nameNative" | "primaryKind">,
) {
  return db.prepare("INSERT INTO people (id, name, name_native, primary_kind) VALUES (?, ?, ?, ?)")
    .bind(personId, value.name, value.nameNative, value.primaryKind);
}
