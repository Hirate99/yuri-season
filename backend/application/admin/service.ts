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
import type { AdminPrincipal } from "~/infrastructure/auth";

export async function readAdminDashboard(db: D1Database) {
  const [data, coverage, seasonIndex] = await Promise.all([
    readAdminDashboardData(db),
    readAdminCoverage(db),
    readSeasons(db),
  ]);
  return { ...data, coverage, seasons: seasonIndex.seasons };
}

export function createAdminService(env: Env, principal?: AdminPrincipal) {
  return {
    dashboard: () => readAdminDashboard(env.DB),
    anime: {
      create: (value: AnimeCreate) => createAnime(env.DB, value, principal),
      patch: (id: string, value: AnimePatch) => patchAnime(env.DB, id, value, principal),
    },
    candidates: {
      create: (value: CandidateDraft) => createCandidate(env.DB, value),
      decide: (id: string, decision: ReviewDecision, reason: string) => applyCandidateDecision(env.DB, id, decision, {
        reviewerType: "admin",
        reasons: reason ? [reason] : [],
        principal,
      }),
    },
    discussions: {
      delete: (id: string, reason: string) => deleteDiscussionEverywhere(env.DB, id, reason, principal),
    },
    resources: {
      list: (animeId: string) => readAdminAnimeResources(env.DB, animeId),
      create: (animeId: string, value: AdminResourceWrite) => createAdminResource(env.DB, animeId, value, principal),
      update: (animeId: string, kind: AdminResourceKind, id: string, value: AdminResourceWrite) =>
        updateAdminResource(env.DB, animeId, kind, id, value, principal),
      delete: (animeId: string, kind: Exclude<AdminResourceKind, "source">, id: string) =>
        deleteAdminResource(env.DB, animeId, kind, id, principal),
    },
    seasons: {
      create: (value: SeasonWrite) => createSeason(env.DB, value, principal),
      update: (id: string, value: SeasonWrite) => updateSeason(env.DB, id, value, principal),
    },
  };
}
