import type { SeasonWrite } from "@/domain";
import { createId, HttpError } from "../http";
import { auditStatement } from "./audit";

export async function createSeason(db: D1Database, value: SeasonWrite): Promise<string> {
  const id = createId("season");
  const statements = [];
  if (value.isCurrent) statements.push(db.prepare("UPDATE seasons SET is_current = 0"));
  statements.push(db.prepare(`
    INSERT INTO seasons (id, slug, label, starts_on, ends_on, is_current)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, value.slug, value.label, value.startsOn, value.endsOn, value.isCurrent ? 1 : 0));
  statements.push(auditStatement(db, "admin", "create_season", "season", id, { after: value }));
  try {
    await db.batch(statements);
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) throw new HttpError(409, "季度标识已存在。");
    throw error;
  }
  return id;
}

export async function updateSeason(db: D1Database, id: string, value: SeasonWrite): Promise<void> {
  const existing = await db.prepare(`
    SELECT slug, label, starts_on, ends_on, is_current FROM seasons WHERE id = ?
  `).bind(id).first<Record<string, unknown> & { is_current: number }>();
  if (!existing) throw new HttpError(404, "季度不存在。");
  if (existing.is_current === 1 && !value.isCurrent) {
    throw new HttpError(400, "请先把另一个季度设为当季。");
  }
  const statements = [];
  if (value.isCurrent) statements.push(db.prepare("UPDATE seasons SET is_current = 0 WHERE id <> ?").bind(id));
  statements.push(db.prepare(`
    UPDATE seasons SET slug = ?, label = ?, starts_on = ?, ends_on = ?, is_current = ?
    WHERE id = ?
  `).bind(value.slug, value.label, value.startsOn, value.endsOn, value.isCurrent ? 1 : 0, id));
  statements.push(auditStatement(db, "admin", "update_season", "season", id, {
    before: existing,
    after: value,
  }));
  try {
    await db.batch(statements);
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) throw new HttpError(409, "季度标识已存在。");
    throw error;
  }
}
