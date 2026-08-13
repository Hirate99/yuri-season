import type { AnimeCreate, AnimePatch } from "@/domain";
import { eq, sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { animeTable, seasonsTable, type AnimeUpdate } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { auditInsert } from "../audit";

export async function patchAnime(db: D1Database, id: string, patch: AnimePatch): Promise<void> {
  const values = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as AnimeUpdate;
  if (Object.keys(values).length === 0) throw new HttpError(400, "没有可更新的字段。");

  const orm = database(db);
  const before = await orm.select().from(animeTable).where(eq(animeTable.id, id)).get();
  if (!before) throw new HttpError(404, "没有找到这部动画。");

  await orm.batch([
    orm.update(animeTable)
      .set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(animeTable.id, id)),
    auditInsert(db, "admin", "update_anime", "anime", id, { before, patch }),
  ]);
}

export async function createAnime(db: D1Database, value: AnimeCreate): Promise<string> {
  const orm = database(db);
  const season = await orm.select({ id: seasonsTable.id })
    .from(seasonsTable)
    .where(eq(seasonsTable.id, value.seasonId))
    .get();
  if (!season) throw new HttpError(400, "季节不存在。");

  const id = createId("anime");
  try {
    await orm.batch([
      orm.insert(animeTable).values({
        id,
        seasonId: value.seasonId,
        slug: value.slug,
        titleZh: value.titleZh,
        titleZhSourceUrl: value.titleZhSourceUrl ?? null,
        titleJa: value.titleJa,
        titleEn: value.titleEn ?? null,
        synopsis: value.synopsis,
        editorialNote: value.editorialNote ?? null,
        yuriKind: value.yuriKind,
        yuriStatus: value.yuriStatus,
        status: value.status,
        premiereAt: value.premiereAt,
        episodeCount: value.episodeCount ?? null,
        episodeDurationMin: value.episodeDurationMin ?? null,
        premiereEpisodeCount: value.premiereEpisodeCount ?? 1,
        latestVerifiedEpisode: value.latestVerifiedEpisode ?? null,
        latestEpisodeSourceUrl: value.latestEpisodeSourceUrl ?? null,
        latestEpisodeCheckedAt: value.latestEpisodeCheckedAt ?? null,
        studio: value.studio ?? null,
        sourceMaterial: value.sourceMaterial ?? null,
        officialUrl: value.officialUrl ?? null,
        bangumiUrl: value.bangumiUrl ?? null,
        officialXUrl: value.officialXUrl ?? null,
        coverUrl: value.coverUrl ?? null,
        coverSourceUrl: value.coverSourceUrl ?? null,
        mainCharacterSourceUrl: value.mainCharacterSourceUrl ?? null,
        mainCharacterExpectedCount: value.mainCharacterExpectedCount ?? null,
        mainCharacterCheckedAt: value.mainCharacterCheckedAt ?? null,
        visualTheme: value.visualTheme,
        featured: value.featured,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      }),
      auditInsert(db, "admin", "create_anime", "anime", id, { after: value }),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) {
      throw new HttpError(409, "作品 slug 已存在。");
    }
    throw error;
  }
  return id;
}
