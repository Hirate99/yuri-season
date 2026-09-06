import type { BatchResult, ResearchBatch, ThemeSongWrite } from "@/domain";
import { eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { researchRunsTable, sourceObservationsTable } from "~/infrastructure/db/schema";
import { applyCandidateDecision } from "~/repositories/candidates/decisions";
import { createCandidate } from "~/repositories/candidates/write";
import { upsertVerifiedThemeSongFromBatch } from "~/repositories/admin/theme-song";
import { recordAudit } from "~/repositories/audit";
import { resolveSearchHit } from "~/repositories/search-memory";
import { stableFingerprint } from "~/shared/fingerprint";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

import { prepareBatchCandidate, storeAccountDiscovery } from "./batch-candidates";
import { rememberBatchEvidence } from "./batch-evidence";
import { decideBatchCandidate } from "./batch-policy";
import { resolveObservationSource } from "./batch-sources";

export async function ingestResearchBatch(db: D1Database, batch: ResearchBatch): Promise<BatchResult> {
  const orm = database(db);
  const previous = await orm.select({ id: researchRunsTable.id, status: researchRunsTable.status })
    .from(researchRunsTable).where(eq(researchRunsTable.externalBatchId, batch.batchId)).get();
  if (previous?.status === "completed") {
    return { runId: previous.id, duplicate: true, observations: 0, candidates: 0, published: 0, held: 0, rejected: 0, resources: 0 };
  }
  if (previous?.status === "running") throw new HttpError(409, "This batch is already running.");

  const runId = previous?.id ?? createId("run");
  const result: BatchResult = {
    runId,
    duplicate: false,
    observations: 0,
    candidates: 0,
    published: 0,
    held: 0,
    rejected: 0,
    resources: 0,
  };
  const message = JSON.stringify({ agent: batch.agent, scope: batch.scope, note: batch.note });
  const running = {
    status: "running" as const,
    sourceCount: 0,
    observationCount: 0,
    candidateCount: 0,
    publishedCount: 0,
    heldCount: 0,
    rejectedCount: 0,
    jobCount: 0,
    message,
    startedAt: sql`CURRENT_TIMESTAMP`,
    finishedAt: null,
  };
  if (previous) {
    await orm.update(researchRunsTable).set(running).where(eq(researchRunsTable.id, runId));
  } else {
    await orm.insert(researchRunsTable).values({
      id: runId,
      externalBatchId: batch.batchId,
      triggerType: "local_skill",
      ...running,
    });
  }

  try {
    for (const observation of batch.observations) {
      const source = await resolveObservationSource(db, observation);
      const contentHash = await stableFingerprint(
        `${observation.sourceItemId ?? observation.canonicalUrl}|${observation.excerpt}|${observation.publicText ?? ""}|${observation.publicTranslation ?? ""}`,
      );
      const existing = await orm.select({ id: sourceObservationsTable.id }).from(sourceObservationsTable)
        .where(sql`${sourceObservationsTable.sourceId} = ${source.id} AND ${sourceObservationsTable.contentHash} = ${contentHash}`)
        .get();
      const observationId = existing?.id ?? createId("observation");
      if (!existing) {
        const relatedAnime = new Set([
          ...observation.candidates.map((candidate) => candidate.animeId).filter((id): id is string => Boolean(id)),
          ...observation.candidates.flatMap((candidate) => candidate.animeIds ?? []),
          ...(observation.accountDiscoveries ?? []).map((discovery) => discovery.animeId),
        ]);
        const observationAnimeId = source.animeId ?? (relatedAnime.size === 1 ? [...relatedAnime][0] : null);
        await orm.insert(sourceObservationsTable).values({
          id: observationId,
          sourceId: source.id,
          animeId: observationAnimeId,
          canonicalUrl: observation.canonicalUrl,
          sourceItemId: observation.sourceItemId ?? null,
          title: observation.title ?? null,
          excerpt: observation.excerpt,
          publicText: observation.publicText ?? null,
          publicTranslation: observation.publicTranslation ?? null,
          authorName: observation.authorName ?? null,
          publishedAt: observation.publishedAt ?? null,
          capturedAt: sql`CURRENT_TIMESTAMP`,
          connectorVersion: "local-codex@1",
          originalLanguage: observation.language ?? null,
          contentType: observation.contentType ?? "text/plain",
          httpStatus: 200,
          contentHash,
          metadataJson: JSON.stringify(observation.metadata ?? {}),
        });
        result.observations += 1;
      }
      await rememberBatchEvidence(db, batch, source, observation, observationId, contentHash);

      for (const discovery of observation.accountDiscoveries ?? []) {
        if (await storeAccountDiscovery(db, observationId, discovery)) result.resources += 1;
        await resolveSearchHit(db, observation.canonicalUrl, "held", { observationId });
      }

      for (const candidate of observation.candidates) {
        const draft = await prepareBatchCandidate(db, candidate, observation, source, observationId);
        const candidateId = await createCandidate(db, draft);
        const evidenceUrls = new Set([observation.canonicalUrl, candidate.url]);
        for (const url of evidenceUrls) await resolveSearchHit(db, url, "candidate", { observationId, candidateId });

        const policy = decideBatchCandidate(candidate, source, observation);
        await applyCandidateDecision(db, candidateId, policy.decision, {
          reviewerType: "local_skill",
          confidence: candidate.review.confidence,
          model: candidate.review.model,
          promptVersion: candidate.review.promptVersion ?? "local-review@1",
          reasons: policy.reasons,
          output: candidate.review,
        });
        const outcome = policy.decision === "publish" ? "published" : policy.decision === "reject" ? "rejected" : "held";
        for (const url of evidenceUrls) await resolveSearchHit(db, url, outcome, { observationId, candidateId });
        result.candidates += 1;
        result[policy.decision === "publish" ? "published" : policy.decision === "reject" ? "rejected" : "held"] += 1;
      }

      for (const { animeId, review, ...song } of observation.themeSongs ?? []) {
        if (source.trustLevel !== "official" || source.animeId !== animeId) {
          throw new HttpError(400, "Theme-song automation requires a matching first-party work source.");
        }
        if (review.decision !== "publish" || review.confidence < 0.92) continue;
        const value: ThemeSongWrite = {
          ...song,
          trackId: null,
          sourceUrl: observation.canonicalUrl,
          verified: true,
        };
        const stored = await upsertVerifiedThemeSongFromBatch(db, animeId, value);
        if (stored.created) result.resources += 1;
        await recordAudit(db, "local_skill", stored.created ? "create_resource" : "verify_resource", "theme_song", stored.id, {
          animeId,
          sourceUrl: observation.canonicalUrl,
          review,
        });
        await resolveSearchHit(db, observation.canonicalUrl, "published", { observationId });
      }
    }

    await orm.update(researchRunsTable).set({
      status: "completed",
      observationCount: result.observations,
      candidateCount: result.candidates,
      publishedCount: result.published,
      heldCount: result.held,
      rejectedCount: result.rejected,
      finishedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(researchRunsTable.id, runId));
    await recordAudit(db, "local_skill", "ingest_batch", "research_run", runId, result);
    return result;
  } catch (error) {
    await orm.update(researchRunsTable).set({
      status: "failed",
      message: error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800),
      finishedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(researchRunsTable.id, runId));
    throw error;
  }
}
