import type { CandidateDraft, ReviewDecision } from "@/domain";
import { atomicBatch } from "../db/transaction";
import { createId, HttpError } from "../http";
import { auditStatement } from "./audit";

export type ReviewMetadata = {
  reviewerType: "llm" | "policy" | "admin" | "local_skill";
  confidence?: number;
  model?: string;
  promptVersion?: string;
  reasons?: string[];
  output?: unknown;
};

type CandidateDecisionRow = {
  id: string;
  anime_id: string | null;
  content_class: CandidateDraft["contentClass"];
  title: string;
  url: string;
  source_name: string;
  published_at: string;
  feed_item_id: string | null;
  withdrawn_at: string | null;
};

async function candidateForDecision(db: D1Database, candidateId: string) {
  return db.prepare(`
    SELECT fc.id, fc.anime_id, fc.content_class, fc.title, fc.url, fc.source_name,
      fc.published_at, fi.id AS feed_item_id, fi.withdrawn_at
    FROM feed_candidates fc
    LEFT JOIN feed_items fi ON fi.candidate_id = fc.id
    WHERE fc.id = ?
  `).bind(candidateId).first<CandidateDecisionRow>();
}

function validateWithdrawal(candidate: CandidateDecisionRow, metadata: ReviewMetadata): void {
  if (!candidate.feed_item_id) throw new HttpError(409, "这条动态尚未发布。");
  if (candidate.withdrawn_at) throw new HttpError(409, "这条动态已经撤回。");
  if (!metadata.reasons?.[0]?.trim()) throw new HttpError(400, "请填写撤回原因。");
}

function validateDecisionTransition(candidate: CandidateDecisionRow, decision: ReviewDecision): void {
  if (!candidate.feed_item_id) return;
  if (candidate.withdrawn_at) {
    if (decision === "withdraw") return;
    throw new HttpError(409, "这条动态已经撤回，不能重新审核或发布。");
  }
  if (decision === "hold" || decision === "reject") {
    throw new HttpError(409, "已发布动态不能改为暂存或拒绝，请使用撤回。");
  }
}

function reviewStatement(
  db: D1Database,
  candidateId: string,
  decision: ReviewDecision,
  metadata: ReviewMetadata,
) {
  return db.prepare(`
    INSERT INTO review_decisions (
      id, candidate_id, reviewer_type, decision, confidence, model,
      prompt_version, reasons_json, output_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    createId("review"),
    candidateId,
    metadata.reviewerType,
    decision,
    metadata.confidence ?? null,
    metadata.model ?? null,
    metadata.promptVersion ?? null,
    JSON.stringify(metadata.reasons ?? []),
    JSON.stringify(metadata.output ?? {}),
  );
}

function publicationStatements(
  db: D1Database,
  candidate: CandidateDecisionRow,
  metadata: ReviewMetadata,
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];

  if (candidate.content_class === "community_thread" && candidate.anime_id) {
    statements.push(db.prepare(`
      INSERT INTO discussions (
        id, anime_id, platform, title, url, note, last_activity_at, last_checked_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(url) DO UPDATE SET
        platform = excluded.platform,
        title = excluded.title,
        is_active = 1,
        last_activity_at = excluded.last_activity_at,
        last_checked_at = CURRENT_TIMESTAMP
    `).bind(
      createId("discussion"),
      candidate.anime_id,
      candidate.source_name,
      candidate.title,
      candidate.url,
      candidate.published_at,
    ));
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO discussion_anime (discussion_id, anime_id)
      SELECT d.id, ca.anime_id
      FROM discussions d
      JOIN candidate_anime ca ON ca.candidate_id = ?
      WHERE d.url = ?
    `).bind(candidate.id, candidate.url));
  }

  statements.push(db.prepare(`
    INSERT OR IGNORE INTO feed_items (
      id, candidate_id, anime_id, person_id, character_id, account_id,
      platform_object_id, origin_key, event_id, media_id, discussion_id,
      content_class, source_identity, title, summary, url, source_name,
      source_account, importance, published_at, safety_rating, spoiler_level,
      auto_published
    )
    SELECT ?, id, anime_id, person_id, character_id, account_id,
      platform_object_id, origin_key, event_id, media_id,
      CASE WHEN content_class = 'community_thread'
        THEN (SELECT id FROM discussions WHERE url = feed_candidates.url)
        ELSE NULL END,
      content_class, source_identity, title, summary, url, source_name,
      source_account, importance, published_at, safety_rating, spoiler_level, ?
    FROM feed_candidates WHERE id = ?
  `).bind(createId("feed"), metadata.reviewerType === "admin" ? 0 : 1, candidate.id));
  return statements;
}

function withdrawalStatements(
  db: D1Database,
  feedItemId: string,
  actorType: "system" | "llm" | "admin" | "local_skill",
  reason: string,
): D1PreparedStatement[] {
  return [
    db.prepare(`
      INSERT INTO corrections (
        id, feed_item_id, correction_type, reason, replacement_feed_item_id, actor_type
      ) VALUES (?, ?, 'withdraw', ?, NULL, ?)
    `).bind(createId("correction"), feedItemId, reason, actorType),
    db.prepare(`
      UPDATE feed_items SET withdrawn_at = CURRENT_TIMESTAMP
      WHERE id = ? AND withdrawn_at IS NULL
    `).bind(feedItemId),
  ];
}

export async function applyCandidateDecision(
  db: D1Database,
  candidateId: string,
  decision: ReviewDecision,
  metadata: ReviewMetadata,
): Promise<void> {
  const candidate = await candidateForDecision(db, candidateId);
  if (!candidate) throw new HttpError(404, "没有找到这条候选。");
  validateDecisionTransition(candidate, decision);
  if (decision === "withdraw") validateWithdrawal(candidate, metadata);

  const status = decision === "publish" || decision === "withdraw"
    ? "published"
    : decision === "hold" ? "held" : "rejected";
  const actorType = metadata.reviewerType === "policy" ? "system" : metadata.reviewerType;
  const statements: D1PreparedStatement[] = [
    db.prepare("UPDATE feed_candidates SET status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(status, candidateId),
    reviewStatement(db, candidateId, decision, metadata),
  ];

  if (decision === "publish") statements.push(...publicationStatements(db, candidate, metadata));
  if (decision === "withdraw") {
    statements.push(...withdrawalStatements(
      db,
      candidate.feed_item_id!,
      actorType,
      metadata.reasons![0].trim(),
    ));
  }
  statements.push(auditStatement(db, actorType, "review_candidate", "feed_candidate", candidateId, {
    decision,
    reasons: metadata.reasons ?? [],
    feedItemId: candidate.feed_item_id,
  }));
  await atomicBatch(db, statements);
}
