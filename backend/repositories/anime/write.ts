import type { AnimeCreate, AnimePatch } from "@/domain";
import { eq, sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { animeTable, seasonsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { auditInsert } from "../audit";
import type { AdminPrincipal } from "~/infrastructure/auth";

export async function patchAnime(
  db: D1Database,
  id: string,
  patch: AnimePatch,
  principal?: AdminPrincipal,
): Promise<void> {
  if (!Object.values(patch).some((value) => value !== undefined))
    throw new HttpError(400, "没有可更新的字段。");

  const orm = database(db);
  const before = await orm.select().from(animeTable).where(eq(animeTable.id, id)).get();
  if (!before) throw new HttpError(404, "没有找到这部动画。");

  await orm.batch([
    orm
      .update(animeTable)
      .set({ ...patch, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(animeTable.id, id)),
    auditInsert(db, "admin", "update_anime", "anime", id, { principal, before, patch }),
  ]);
}

export async function createAnime(
  db: D1Database,
  value: AnimeCreate,
  principal?: AdminPrincipal,
): Promise<string> {
  const orm = database(db);

  const season = await orm
    .select({ id: seasonsTable.id })
    .from(seasonsTable)
    .where(eq(seasonsTable.id, value.seasonId))
    .get();
  if (!season) throw new HttpError(400, "季节不存在。");

  const id = createId("anime");

  try {
    await orm.batch([
      orm.insert(animeTable).values({
        id,
        ...value,
        premiereEpisodeCount: value.premiereEpisodeCount ?? 1,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      }),
      auditInsert(db, "admin", "create_anime", "anime", id, { principal, after: value }),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) {
      throw new HttpError(409, "作品 slug 已存在。");
    }

    throw error;
  }

  return id;
}
