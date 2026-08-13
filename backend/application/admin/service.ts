import type {
  AdminResourceKind,
  AdminResourceWrite,
  AnimeCreate,
  AnimePatch,
  CandidateDraft,
  ReviewDecision,
  SeasonWrite,
} from "@/domain";
import { createAdminResource, deleteAdminResource, updateAdminResource } from "./resources";
import { readAdminAnimeResources } from "~/repositories/admin/resources";
import { readAdminDashboardData } from "~/repositories/admin/dashboard";
import { readAdminCoverage } from "~/repositories/admin/coverage";
import { readSeasons } from "~/repositories/catalog";
import { deleteDiscussionEverywhere } from "~/repositories/admin/discussion";
import { createAnime, patchAnime } from "~/repositories/anime/write";
import { applyCandidateDecision } from "~/repositories/candidates/decisions";
import { createCandidate } from "~/repositories/candidates/write";
import { createSeason, updateSeason } from "~/repositories/seasons/write";

export async function readAdminDashboard(db: D1Database) {
  const [data, coverage, seasonIndex] = await Promise.all([
    readAdminDashboardData(db),
    readAdminCoverage(db),
    readSeasons(db),
  ]);
  return { ...data, coverage, seasons: seasonIndex.seasons };
}

export function createAdminService(env: Env) {
  return {
    dashboard: () => readAdminDashboard(env.DB),
    anime: {
      create: (value: AnimeCreate) => createAnime(env.DB, value),
      patch: (id: string, value: AnimePatch) => patchAnime(env.DB, id, value),
    },
    candidates: {
      create: (value: CandidateDraft) => createCandidate(env.DB, value),
      decide: (id: string, decision: ReviewDecision, reason: string) => applyCandidateDecision(env.DB, id, decision, {
        reviewerType: "admin",
        reasons: reason ? [reason] : [],
      }),
    },
    discussions: {
      delete: (id: string, reason: string) => deleteDiscussionEverywhere(env.DB, id, reason),
    },
    resources: {
      list: (animeId: string) => readAdminAnimeResources(env.DB, animeId),
      create: (animeId: string, value: AdminResourceWrite) => createAdminResource(env.DB, animeId, value),
      update: (animeId: string, kind: AdminResourceKind, id: string, value: AdminResourceWrite) =>
        updateAdminResource(env.DB, animeId, kind, id, value),
      delete: (animeId: string, kind: Exclude<AdminResourceKind, "source">, id: string) =>
        deleteAdminResource(env.DB, animeId, kind, id),
    },
    seasons: {
      create: (value: SeasonWrite) => createSeason(env.DB, value),
      update: (id: string, value: SeasonWrite) => updateSeason(env.DB, id, value),
    },
  };
}
