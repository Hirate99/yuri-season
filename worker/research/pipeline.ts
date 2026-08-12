import { createCandidate, applyCandidateDecision } from "../repositories/mutations";
import { extractCandidate } from "./extractor";
import { storeClaim, sourceHasBaseline, storeObservation } from "./observations";
import { reviewCandidate } from "./reviewer";
import { fetchSource } from "./source-fetcher";
import { markSourceFailure, markSourceSuccess, readSource } from "./sources";
import type { RunCounters, SourceTransport, UpdateJobRow } from "./types";

function emptyCounters(): RunCounters {
  return { sources: 0, observations: 0, candidates: 0, published: 0, held: 0, rejected: 0 };
}

async function holdAfterReviewFailure(
  db: D1Database,
  candidateId: string,
  error: unknown,
): Promise<void> {
  await applyCandidateDecision(db, candidateId, "hold", {
    reviewerType: "policy",
    promptVersion: "review-fallback@1",
    reasons: ["自动审核暂时不可用，已转人工复核"],
    output: { error: error instanceof Error ? error.message : String(error) },
  });
}

export async function syncSourceJob(env: Env, job: UpdateJobRow, transport?: SourceTransport): Promise<{
  counters: RunCounters;
  partial: boolean;
}> {
  const counters = emptyCounters();
  const sourceId = job.scope_id;
  if (!sourceId) throw new Error("sync_source job has no source scope");
  const source = await readSource(env.DB, sourceId);
  if (!source) throw new Error(`source ${sourceId} is missing or disabled`);
  counters.sources = 1;

  try {
    const hadBaseline = await sourceHasBaseline(env.DB, source.id);
    const fetched = await fetchSource(source, transport);
    let partial = false;
    for (const item of fetched.items) {
      const observation = await storeObservation(env.DB, source, item, fetched.status);
      if (!observation.inserted) continue;
      counters.observations += 1;
      if (!hadBaseline) continue;
      if (source.change_kind === "catalog_metadata") continue;

      let candidateId: string | null = null;
      try {
        const draft = await extractCandidate(env.AI, source, item, observation.id);
        if (!draft) continue;
        const claimId = await storeClaim(env.DB, observation.id, draft);
        candidateId = await createCandidate(env.DB, { ...draft, claimId });
        counters.candidates += 1;

        const outcome = await reviewCandidate(env.AI, candidateId, draft, source, item);
        await env.DB.prepare(`
          UPDATE feed_candidates SET content_class = ?, title = ?, summary = ?,
            importance = ?, safety_rating = ?, spoiler_level = ?, confidence = ?,
            policy_version = ? WHERE id = ?
        `).bind(
          outcome.review.contentClass,
          outcome.review.title,
          outcome.review.summary,
          outcome.review.importance,
          outcome.review.safetyRating,
          outcome.review.spoilerLevel,
          outcome.review.confidence,
          outcome.policyVersion,
          candidateId,
        ).run();
        await applyCandidateDecision(env.DB, candidateId, outcome.policy.decision, {
          reviewerType: "llm",
          confidence: outcome.review.confidence,
          model: outcome.model,
          promptVersion: outcome.promptVersion,
          reasons: outcome.policy.reasons,
          output: outcome.review,
        });
        if (outcome.policy.decision === "publish") counters.published += 1;
        if (outcome.policy.decision === "hold") counters.held += 1;
        if (outcome.policy.decision === "reject") counters.rejected += 1;
        await env.DB.prepare(`
          UPDATE claims SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(outcome.policy.decision === "publish" ? "accepted" : outcome.policy.decision === "reject" ? "rejected" : "proposed", claimId).run();
      } catch (error) {
        partial = true;
        if (candidateId) {
          await holdAfterReviewFailure(env.DB, candidateId, error);
          counters.held += 1;
        }
        console.warn(JSON.stringify({
          message: "candidate processing failed",
          sourceId,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    }
    await markSourceSuccess(env.DB, source, fetched.etag, fetched.lastModified);
    return { counters, partial };
  } catch (error) {
    await markSourceFailure(env.DB, source.id, error);
    throw error;
  }
}
