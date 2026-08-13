import type { CandidateDraft } from "@/domain";
import { atomicBatch } from "../db/transaction";
import { createId } from "../http";
import { stableFingerprint } from "../lib/fingerprint";

function candidateAnimeIds(draft: CandidateDraft): string[] {
  return [...new Set([draft.animeId, ...(draft.animeIds ?? [])].filter((id): id is string => Boolean(id)))];
}

function candidateAnimeStatements(
  db: D1Database,
  candidateId: string,
  draft: CandidateDraft,
): D1PreparedStatement[] {
  return candidateAnimeIds(draft).map((animeId) => db.prepare(`
    INSERT OR IGNORE INTO candidate_anime (candidate_id, anime_id) VALUES (?, ?)
  `).bind(candidateId, animeId));
}

async function existingCandidateId(
  db: D1Database,
  draft: CandidateDraft,
  fingerprint: string,
): Promise<string | null> {
  const row = draft.originKey
    ? await db.prepare("SELECT id FROM feed_candidates WHERE origin_key = ?")
        .bind(draft.originKey).first<{ id: string }>()
    : await db.prepare("SELECT id FROM feed_candidates WHERE fingerprint = ?")
        .bind(fingerprint).first<{ id: string }>();
  return row?.id ?? null;
}

function evidenceStatement(
  db: D1Database,
  candidateId: string,
  draft: CandidateDraft,
): D1PreparedStatement | null {
  if (!draft.observationId && !draft.claimId) return null;
  return db.prepare(`
    INSERT OR IGNORE INTO candidate_evidence (
      id, candidate_id, observation_id, claim_id, relation
    ) VALUES (?, ?, ?, ?, 'supports')
  `).bind(
    createId("evidence"), candidateId, draft.observationId ?? null, draft.claimId ?? null,
  );
}

async function mediaWrite(
  db: D1Database,
  draft: CandidateDraft,
): Promise<{ id: string | null; statement: D1PreparedStatement | null }> {
  if (!draft.media) return { id: null, statement: null };
  const existing = await db.prepare("SELECT id FROM media_items WHERE original_url = ?")
    .bind(draft.media.originalUrl)
    .first<{ id: string }>();
  if (existing) return { id: existing.id, statement: null };

  const id = createId("media");
  return {
    id,
    statement: db.prepare(`
      INSERT INTO media_items (
        id, anime_id, person_id, character_id, content_class, title,
        creator_name, creator_url, original_url, preview_url, presentation_mode,
        safety_rating, spoiler_level, rights_note, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      draft.animeId ?? null,
      draft.personId ?? null,
      draft.characterId ?? null,
      draft.media.contentClass,
      draft.media.title,
      draft.media.creatorName,
      draft.media.creatorUrl ?? null,
      draft.media.originalUrl,
      draft.media.previewUrl ?? null,
      draft.media.presentationMode ?? "link_only",
      draft.media.safetyRating ?? draft.safetyRating ?? "unknown",
      draft.media.spoilerLevel ?? draft.spoilerLevel ?? "none",
      draft.media.rightsNote ?? null,
      draft.publishedAt,
    ),
  };
}

export async function createCandidate(db: D1Database, draft: CandidateDraft): Promise<string> {
  const fingerprint = await stableFingerprint(
    draft.originKey ?? `${draft.url}|${draft.title}|${draft.publishedAt}`,
  );
  const existingId = await existingCandidateId(db, draft, fingerprint);
  if (existingId) {
    const evidence = evidenceStatement(db, existingId, draft);
    const statements = candidateAnimeStatements(db, existingId, draft);
    if (draft.contentClass === "community_thread") {
      statements.push(db.prepare(`
        UPDATE feed_candidates SET
          observation_id = COALESCE(?, observation_id),
          platform_object_id = COALESCE(?, platform_object_id),
          title = ?, summary = ?, source_name = ?, importance = ?, published_at = ?,
          presentation_mode = ?, safety_rating = ?, spoiler_level = ?, confidence = ?,
          extractor_version = ?, policy_version = ?
        WHERE id = ? AND content_class = 'community_thread' AND status != 'published'
      `).bind(
        draft.observationId ?? null,
        draft.platformObjectId ?? null,
        draft.title,
        draft.summary,
        draft.sourceName,
        draft.importance ?? 2,
        draft.publishedAt,
        draft.presentationMode ?? "link_only",
        draft.safetyRating ?? "unknown",
        draft.spoilerLevel ?? "none",
        draft.confidence ?? 0,
        draft.extractorVersion ?? "manual@1",
        draft.policyVersion ?? "publish-policy@1",
        existingId,
      ));
    }
    if (evidence) statements.push(evidence);
    if (statements.length) await atomicBatch(db, statements);
    return existingId;
  }

  const id = createId("candidate");
  const media = await mediaWrite(db, draft);
  const statements: D1PreparedStatement[] = [];
  if (media.statement) statements.push(media.statement);
  statements.push(db.prepare(`
    INSERT INTO feed_candidates (
      id, observation_id, anime_id, person_id, character_id, account_id,
      platform_object_id, origin_key, media_id,
      content_class, source_identity, title, summary, url, source_name,
      source_account, importance, published_at, presentation_mode, safety_rating,
      spoiler_level, confidence, discovered_by, extractor_version, policy_version,
      fingerprint
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    draft.observationId ?? null,
    draft.animeId ?? draft.animeIds?.[0] ?? null,
    draft.personId ?? null,
    draft.characterId ?? null,
    draft.accountId ?? null,
    draft.platformObjectId ?? null,
    draft.originKey ?? null,
    media.id,
    draft.contentClass,
    draft.sourceIdentity,
    draft.title,
    draft.summary,
    draft.url,
    draft.sourceName,
    draft.sourceAccount ?? null,
    draft.importance ?? 2,
    draft.publishedAt,
    draft.presentationMode ?? "link_only",
    draft.safetyRating ?? "unknown",
    draft.spoilerLevel ?? "none",
    draft.confidence ?? 0,
    draft.discoveredBy ?? "manual",
    draft.extractorVersion ?? "manual@1",
    draft.policyVersion ?? "publish-policy@1",
    fingerprint,
  ));
  const evidence = evidenceStatement(db, id, draft);
  if (evidence) statements.push(evidence);
  statements.push(...candidateAnimeStatements(db, id, draft));
  await atomicBatch(db, statements);
  return id;
}
