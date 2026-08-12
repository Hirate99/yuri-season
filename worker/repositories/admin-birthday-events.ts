import type { CastWrite } from "@/domain";
import { createId } from "../http";

type SeasonAnchor = { starts_on: string };

function validDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
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
  const row = await db.prepare(`
    SELECT s.starts_on FROM anime a
    JOIN seasons s ON s.id = a.season_id
    WHERE a.id = ?
  `).bind(animeId).first<SeasonAnchor>();
  if (!row) throw new Error(`Anime ${animeId} has no season`);
  return row.starts_on;
}

export async function birthdayEventStatements(
  db: D1Database,
  animeId: string,
  characterId: string,
  value: CastWrite,
): Promise<D1PreparedStatement[]> {
  const statements = [
    db.prepare("DELETE FROM events WHERE anime_id = ? AND character_id = ? AND event_type = 'birthday'")
      .bind(animeId, characterId),
  ];
  if (!value.birthdayVerified || value.birthdayMonth === null || value.birthdayDay === null || !value.birthdaySourceUrl) {
    return statements;
  }
  const startsAt = birthdayOccurrence(
    await seasonStart(db, animeId),
    value.birthdayMonth,
    value.birthdayDay,
  );
  statements.push(db.prepare(`
    INSERT INTO events (
      id, anime_id, character_id, event_type, title, starts_at, timezone,
      recurrence_rule, source_url, verified, status
    ) VALUES (?, ?, ?, 'birthday', ?, ?, ?, 'FREQ=YEARLY', ?, 1, 'scheduled')
  `).bind(
    createId("birthday"), animeId, characterId, `${value.characterName}生日`, startsAt,
    value.birthdayTimezone, value.birthdaySourceUrl,
  ));
  return statements;
}
