import type { SearchMemoryWrite } from "@/domain";
import { searchMemoryBatchSchema } from "~/http/input/search-memory-input";
import { stableFingerprint } from "~/shared/fingerprint";
import type { DiscoveryQuery } from "./discovery-query-plan";
import { accountUpdateQuery, accountUpdateTarget } from "./discovery-account-updates";
import { fetchDiscoveryContext, type DiscoveryContext } from "./discovery-context";
import {
  memoryRecordForResult,
  type DiscoveryResult,
  type DiscoveryCampaign,
} from "./discovery-campaign";
import { readResearchJson, writeResearchJson } from "./research-cache";
import { rememberSearchRecords } from "./search-memory-client";

const intervalMs = 3 * 60 * 60_000;
const evidenceDirectory = ".research-cache/discovery-results";

export type RoutineObservation = Omit<
  DiscoveryResult,
  "queryId" | "nextCheckAt" | "reasonCodes" | "status"
> & {
  sourceId: string;
  previousPostId: string | null;
};

export function routineSources(context: DiscoveryContext, now = new Date()) {
  const season = context.dashboard.seasons.find((season) => season.isCurrent);
  if (!season) throw new Error("current season is missing");
  const queries: DiscoveryQuery[] = [];
  for (const anime of context.dashboard.anime.filter((work) => work.seasonId === season.id)) {
    const resources = context.resources[anime.id];
    if (!resources) throw new Error(`source context missing for ${anime.id}`);
    for (const account of resources.accounts) {
      if (!["x", "twitter"].includes(account.platform.toLowerCase())) continue;
      const target = accountUpdateTarget(resources, account, anime.id);
      if (!target) continue;
      const prior = context.memory.find(
        (record) =>
          record.scopeType === target.scopeType &&
          record.scopeId === target.scopeId &&
          record.searchKind === "social" &&
          record.targetKey === target.targetKey,
      );
      queries.push({
        ...target,
        id: `${target.scopeType}:${target.scopeId}:social:${target.targetKey}`,
        animeId: anime.id,
        animeTitle: anime.titleZh,
        searchKind: "social",
        operation: target.timelineMode ? "timeline_scan" : "search",
        stage: target.contentLane === "official" ? "official" : "people",
        maxFreshHours: 3,
        completionPolicy: {
          allowedCompleteSurfaces: ["signed_in_timeline", "platform_api"],
          mustReachPreviousCursor: true,
          recordEveryOriginal: true,
          searchEngineCanComplete: false,
        },
        queryText: accountUpdateQuery(
          account,
          anime.titleJa,
          prior?.searchedAt ?? null,
          now,
          target.timelineMode,
        ),
        reason: "增量核验已验证账号的作品相关原帖，保留证据后推进游标。",
        cursor: prior?.cursor ?? {},
        rememberedAt: prior?.searchedAt ?? null,
        knownHits: [],
      });
    }
  }
  return queries
    .map((query) => {
      const memory = context.memory.find(
        (record) =>
          record.scopeType === query.scopeType &&
          record.scopeId === query.scopeId &&
          record.targetKey === query.targetKey &&
          record.searchKind === query.searchKind,
      );
      const checked = Date.parse(memory?.searchedAt ?? "");
      const partialAt = Date.parse(String(query.cursor.lastPartialAt));
      const completedAt = Date.parse(String(query.cursor.completedAt));
      const needsCheck =
        !Number.isFinite(checked) ||
        now.valueOf() - checked >= intervalMs ||
        memory?.status === "blocked" ||
        Boolean(query.cursor.resume) ||
        (Number.isFinite(partialAt) && (!Number.isFinite(completedAt) || partialAt > completedAt));
      const account = context.resources[query.animeId!]?.accounts.find(
        (account) => account.id === query.accountId,
      );
      return {
        query,
        sourceId: query.id,
        url: account?.url ?? null,
        lastCheckedAt: memory?.searchedAt ?? null,
        needsCheck,
      };
    })
    .sort(
      (a, b) => Number(b.needsCheck) - Number(a.needsCheck) || b.query.priority - a.query.priority,
    );
}

export async function routineRecords(
  context: DiscoveryContext,
  observations: RoutineObservation[],
): Promise<SearchMemoryWrite[]> {
  if (!Array.isArray(observations) || !observations.length)
    throw new Error("provide inspected observations");
  const sources = routineSources(context);
  const ids = new Set<string>();
  const records = await Promise.all(
    observations.map(async (observation) => {
      const source = sources.find((source) => source.sourceId === observation.sourceId);
      if (!source || ids.has(observation.sourceId))
        throw new Error(`unknown or duplicate sourceId: ${observation.sourceId}`);
      ids.add(observation.sourceId);
      if (!["complete", "partial", "blocked"].includes(observation.outcome))
        throw new Error("invalid observation outcome");
      if (observation.previousPostId !== (source.query.cursor.committedPostId ?? null))
        throw new Error(
          `cursor changed for ${observation.sourceId}; reconcile saved evidence before recording`,
        );
      const newest = observation.coverage?.newestPostId;
      const stableIds = observation.hits.map((hit) => hit.metadata?.platformObjectId);
      if (new Set(stableIds).size !== stableIds.length)
        throw new Error("duplicate original post IDs");
      if (
        observation.outcome === "complete" &&
        newest &&
        newest !== observation.previousPostId &&
        !stableIds.includes(newest)
      )
        throw new Error("new cursor must identify an inspected original");
      if (
        observation.outcome === "complete" &&
        newest &&
        observation.previousPostId &&
        /^\d+$/.test(newest) &&
        /^\d+$/.test(observation.previousPostId) &&
        BigInt(newest) < BigInt(observation.previousPostId)
      )
        throw new Error("committed cursor cannot move backwards");
      const searched = Date.parse(observation.searchedAt);
      if (!Number.isFinite(searched) || searched > Date.now() + 60_000)
        throw new Error("invalid inspection time");
      if (source.lastCheckedAt && searched < Date.parse(source.lastCheckedAt))
        throw new Error("inspection predates saved source evidence");
      const query: DiscoveryQuery = {
        ...source.query,
        maxFreshHours: 3,
        completionPolicy: {
          ...source.query.completionPolicy,
          allowedCompleteSurfaces: ["signed_in_timeline", "platform_api"],
        },
      };
      return memoryRecordForResult(query, {
        ...observation,
        queryId: query.id,
        status: observation.outcome === "blocked" ? "blocked" : "active",
        nextCheckAt: new Date(
          searched + (observation.outcome === "complete" ? intervalMs : 0),
        ).toISOString(),
      });
    }),
  );
  return searchMemoryBatchSchema.parse({ records });
}

type Receipt = {
  observations: RoutineObservation[];
  records: SearchMemoryWrite[];
  syncedAt: string | null;
  syncedCount?: number;
};

export async function recordRoutine(
  path: string,
  context: (sourceIds: string[]) => Promise<DiscoveryContext> = (sourceIds) =>
    fetchDiscoveryContext("routine", sourceIds),
  sync = rememberSearchRecords,
) {
  const input = (await Bun.file(path).json()) as { observations: RoutineObservation[] };
  if (!Array.isArray(input.observations) || !input.observations.length)
    throw new Error("provide inspected observations");
  if (new Set(input.observations.map((item) => item.sourceId)).size !== input.observations.length)
    throw new Error("duplicate sourceId");
  const fingerprint = await stableFingerprint(JSON.stringify(input.observations));
  const archive = `${evidenceDirectory}/routine-${fingerprint}.json`;
  const saved = await readResearchJson<Receipt | null>(archive, null);
  if (saved?.syncedAt) return { archive, syncedAt: saved.syncedAt };
  // Replay validated records with their original timestamps; the server protects newer memory.
  const receipt: Receipt = saved ?? {
    observations: input.observations,
    records: [],
    syncedAt: null,
    syncedCount: 0,
  };
  // Preserve original evidence before any network access. Each source is its own
  // checkpoint, so an unrelated failure never replays already acknowledged work.
  await writeResearchJson(archive, receipt);
  for (let index = receipt.syncedCount ?? 0; index < receipt.observations.length; index++) {
    const observation = receipt.observations[index];
    if (!receipt.records[index]) {
      const [record] = await routineRecords(await context([observation.sourceId]), [observation]);
      receipt.records[index] = record;
      await writeResearchJson(archive, receipt);
    }
    await sync([receipt.records[index]]);
    receipt.syncedCount = index + 1;
    await writeResearchJson(archive, receipt);
  }
  receipt.syncedAt = new Date().toISOString();
  await writeResearchJson(archive, receipt);
  return { archive, syncedAt: receipt.syncedAt, recorded: receipt.records.length };
}

export async function routineContext({ details = false } = {}) {
  const context = await fetchDiscoveryContext("routine");
  const sources = routineSources(context);
  const legacy = await readResearchJson<DiscoveryCampaign | null>(
    ".research-cache/update-plan.json",
    null,
  );
  const pendingEvidence: string[] = [];
  for await (const path of new Bun.Glob(`${evidenceDirectory}/routine-*.json`).scan()) {
    if (!((await Bun.file(path).json()) as Receipt).syncedAt) pendingEvidence.push(path);
  }
  return {
    checkedAt: new Date().toISOString(),
    recheckIntervalHours: 3,
    works: context.dashboard.anime.map(
      ({ id, titleZh, titleJa, officialUrl, currentEpisode, latestFeedAt }) => ({
        id,
        titleZh,
        titleJa,
        officialUrl,
        currentEpisode,
        latestFeedAt,
      }),
    ),
    sources: sources.map(({ query, ...source }) => ({
      ...source,
      animeId: query.animeId,
      animeTitle: query.animeTitle,
      accountId: query.accountId,
      personId: query.personId,
      lane:
        query.contentLane === "creator" &&
        context.resources[query.animeId!]?.staff.some(
          (staff) =>
            staff.personId === query.personId && !["author", "artist"].includes(staff.primaryKind),
        )
          ? "staff"
          : query.contentLane,
      cursor: query.cursor,
    })),
    recentPublications: context.dashboard.recentPublications,
    unfinishedHits: context.memoryHits
      .filter((hit) => ["candidate", "held"].includes(hit.outcome))
      .map((hit) =>
        details
          ? hit
          : {
              memoryId: hit.memoryId,
              canonicalUrl: hit.canonicalUrl,
              title: hit.title,
              outcome: hit.outcome,
              lastSeenAt: hit.lastSeenAt,
              animeId: hit.metadata.animeId ?? null,
              reason:
                hit.metadata.dispositionReason ??
                hit.metadata.holdReason ??
                hit.metadata.reason ??
                hit.metadata.note ??
                null,
            },
      ),
    recentSearches: context.recentSearches ?? [],
    heldCandidates: context.dashboard.heldCandidates,
    pendingEvidence,
    legacyUnfinished:
      legacy?.queries
        .filter((query) => {
          const completed = sources.find((source) => source.sourceId === query.id)?.query.cursor
            .completedAt;
          return (
            ["pending", "leased", "blocked"].includes(query.state) &&
            !(Date.parse(String(completed)) >= Date.parse(legacy.createdAt))
          );
        })
        .map(({ id, cursor }) => ({
          sourceId: id,
          ...(details ? { cursor } : {}),
        })) ?? [],
    legacyAwaitingSync: legacy?.pendingSubmission?.results.length
      ? { path: ".research-cache/update-plan.json", count: legacy.pendingSubmission.results.length }
      : null,
    handoff: ".research-cache/routine-editorial.md",
  };
}
