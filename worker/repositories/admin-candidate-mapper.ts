import type { FeedCandidate } from "@/domain";
import type { CandidateRow } from "../db/admin-rows";

function parseReviewReasons(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function mapCandidate(row: CandidateRow): FeedCandidate {
  return {
    id: row.id,
    animeId: row.anime_id,
    animeTitle: row.anime_title,
    accountId: row.account_id,
    platformObjectId: row.platform_object_id,
    contentClass: row.content_class,
    sourceIdentity: row.source_identity,
    title: row.title,
    summary: row.summary,
    url: row.url,
    sourceName: row.source_name,
    sourceAccount: row.source_account,
    importance: row.importance,
    publishedAt: row.published_at,
    presentationMode: row.presentation_mode,
    safetyRating: row.safety_rating,
    spoilerLevel: row.spoiler_level,
    confidence: row.confidence,
    status: row.status,
    discoveredBy: row.discovered_by,
    personName: row.person_name,
    characterName: row.character_name,
    evidenceCount: row.evidence_count,
    reviewReasons: parseReviewReasons(row.review_reasons_json),
  };
}
