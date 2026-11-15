import { and, eq, inArray } from "drizzle-orm";
import type { AdminAnimeResources, SearchMemoryWrite } from "@/domain";
import { animeTable } from "~/infrastructure/db/schema";
import { readHeldCandidates, readPublications, readWorks } from "~/repositories/admin/dashboard";
import { readAdminAnimeResources } from "~/repositories/admin/resources";
import { currentSeason } from "~/repositories/catalog";
import { readSearchMemory, readSearchMemoryHits } from "~/repositories/search-memory";
import { HttpError } from "~/shared/http-error";

function routineKey(sourceId: string) {
  const match = /^(anime|person):([^:]+):social:(updates:([^:]+):([^:]+))$/.exec(sourceId);
  if (!match) throw new HttpError(400, "无效的例行检查来源 ID。");
  return {
    scopeType: match[1] as SearchMemoryWrite["scopeType"],
    scopeId: match[2],
    searchKind: "social" as const,
    targetKey: match[3],
    animeId: match[4],
  };
}

/** Research must not depend on the admin dashboard's audit, jobs or coverage reads. */
export async function readResearchContext(
  db: D1Database,
  mode: "routine" | "discovery",
  sourceIds?: string[],
) {
  const keys = sourceIds?.map(routineKey);
  const season = await currentSeason(db);
  const anime = await readWorks(
    db,
    and(
      eq(animeTable.seasonId, season.id),
      keys ? inArray(animeTable.id, [...new Set(keys.map((key) => key.animeId))]) : undefined,
    ),
  );
  if (keys?.some((key) => !anime.some((work) => work.id === key.animeId)))
    throw new HttpError(409, "来源所属作品已不在当前季度，请重新检查上下文。");

  const resources: Record<string, AdminAnimeResources> = {};
  // One server request, bounded DB concurrency, only current/explicitly requested works.
  for (let index = 0; index < anime.length; index += 4) {
    await Promise.all(
      anime.slice(index, index + 4).map(async (work) => {
        resources[work.id] = await readAdminAnimeResources(db, work.id, mode === "discovery");
      }),
    );
  }
  const [memory, memoryHits, recentPublications, heldCandidates] = await Promise.all([
    readSearchMemory(db, keys),
    keys ? Promise.resolve([]) : readSearchMemoryHits(db, mode === "routine"),
    keys ? Promise.resolve([]) : readPublications(db),
    keys ? Promise.resolve([]) : readHeldCandidates(db),
  ]);
  return {
    dashboard: {
      anime,
      seasons: [{ ...season, animeCount: anime.length, isCurrent: true }],
      recentPublications,
      heldCandidates,
    },
    resources,
    memory,
    memoryHits,
  };
}
