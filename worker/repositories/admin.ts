import type { AdminDashboard } from "@/domain";
import { mapAnime } from "../db/mappers";
import { allRows, firstRow } from "../db/query";
import {
  auditLogQuery,
  dashboardCountsQuery,
  heldCandidatesQuery,
  publicationsQuery,
  researchRunsQuery,
  sourcesQuery,
  updateJobsQuery,
} from "../db/queries/admin";
import { readAllAnimeSummaries } from "../db/read-models/anime";
import {
  mapAudit,
  mapCandidate,
  mapJob,
  mapPublication,
  mapRun,
  mapSource,
} from "./admin-mappers";
import { readAdminCoverage } from "./admin-coverage";
import { readSeasons } from "./catalog";

export async function readAdminDashboard(db: D1Database): Promise<AdminDashboard> {
  const [
    counts,
    animeRows,
    coverage,
    heldCandidates,
    sources,
    recentRuns,
    recentJobs,
    recentPublications,
    recentAudit,
    seasonIndex,
  ] = await Promise.all([
    firstRow(db, dashboardCountsQuery),
    readAllAnimeSummaries(db),
    readAdminCoverage(db),
    allRows(db, heldCandidatesQuery),
    allRows(db, sourcesQuery),
    allRows(db, researchRunsQuery),
    allRows(db, updateJobsQuery),
    allRows(db, publicationsQuery),
    allRows(db, auditLogQuery),
    readSeasons(db),
  ]);

  return {
    counts: {
      anime: counts?.anime_count ?? 0,
      held: counts?.held_count ?? 0,
      sources: counts?.source_count ?? 0,
      activeDiscussions: counts?.discussion_count ?? 0,
      autoPublished: counts?.auto_count ?? 0,
    },
    anime: animeRows.map((row) => ({
      ...mapAnime(row),
      seasonId: row.seasonId,
      seasonLabel: row.seasonLabel,
    })),
    coverage,
    heldCandidates: heldCandidates.map(mapCandidate),
    sources: sources.map(mapSource),
    recentRuns: recentRuns.map(mapRun),
    recentJobs: recentJobs.map(mapJob),
    recentPublications: recentPublications.map(mapPublication),
    recentAudit: recentAudit.map(mapAudit),
    seasons: seasonIndex.seasons,
  };
}
