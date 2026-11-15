import { and, eq, inArray } from "drizzle-orm";
import type { AdminAnimeResources, SearchMemoryWrite } from "@/domain";
import { animeTable } from "~/infrastructure/db/schema";
import { readHeldCandidates, readPublications, readWorks } from "~/repositories/admin/dashboard";
import { readAdminAnimeResources } from "~/repositories/admin/resources";
import { currentSeason } from "~/repositories/catalog";
import {
  readRecentDiscoverySearches,
  readSearchMemoryState,
  readSearchMemoryHits,
} from "~/repositories/search-memory";
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
  const routineKeys =
    keys ??
    anime.flatMap((work) =>
      resources[work.id].accounts
        .filter(
          (account) =>
            account.verified &&
            account.monitorMode !== "disabled" &&
            ["x", "twitter"].includes(account.platform.toLowerCase()),
        )
        .map((account) => ({
          scopeType: account.ownerType === "person" ? ("person" as const) : ("anime" as const),
          scopeId: account.ownerType === "person" ? account.ownerId : work.id,
          searchKind: "social" as const,
          targetKey: `updates:${work.id}:${account.id}`,
        })),
    );
  async function scopedMemory() {
    const scopes =
      mode === "discovery" && !keys
        ? [
            { scopeType: "season" as const, scopeId: season.id },
            ...anime.map((work) => ({ scopeType: "anime" as const, scopeId: work.id })),
            ...Object.values(resources).flatMap((resource) => [
              ...resource.accounts
                .filter((account) => account.ownerType === "person")
                .map((account) => ({ scopeType: "person" as const, scopeId: account.ownerId })),
              ...resource.staff.map((staff) => ({
                scopeType: "person" as const,
                scopeId: staff.personId,
              })),
              ...resource.cast.flatMap((cast) => [
                { scopeType: "person" as const, scopeId: cast.personId },
                { scopeType: "character" as const, scopeId: cast.characterId },
              ]),
            ]),
          ]
        : routineKeys;
    const requested = [...new Map(scopes.map((key) => [JSON.stringify(key), key])).values()];
    const records = [];
    // Four parameters per key; keep below D1's 100-parameter ceiling.
    // Do not truncate current source cursors to a global recent-history window.
    for (let offset = 0; offset < requested.length; offset += 20)
      records.push(...(await readSearchMemoryState(db, requested.slice(offset, offset + 20))));
    return records;
  }
  const [memory, memoryHits, recentPublications, heldCandidates, recentSearches] =
    await Promise.all([
      scopedMemory(),
      keys ? Promise.resolve([]) : readSearchMemoryHits(db, mode === "routine"),
      keys ? Promise.resolve([]) : readPublications(db),
      keys ? Promise.resolve([]) : readHeldCandidates(db),
      keys ? Promise.resolve([]) : readRecentDiscoverySearches(db),
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
    recentSearches,
  };
}
