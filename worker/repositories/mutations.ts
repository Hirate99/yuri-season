import type {
  AnimeCreate,
  AnimePatch,
  CandidateDraft,
  ReviewDecision,
} from "@/domain";
import { createId, HttpError } from "../http";
import { stableFingerprint } from "../lib/fingerprint";
import { eq, sql } from "drizzle-orm";
import { database } from "../db/client";
import { animeTable, type AnimeUpdate } from "../db/schema";
import { auditStatement, recordAudit } from "./audit";

export async function patchAnime(db: D1Database, id: string, patch: AnimePatch): Promise<void> {
  const values = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as AnimeUpdate;
  if (Object.keys(values).length === 0) throw new HttpError(400, "没有可更新的字段。" );
  const before = await db.prepare("SELECT * FROM anime WHERE id = ?").bind(id).first<Record<string, unknown>>();
  const result = await database(db).update(animeTable)
    .set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(animeTable.id, id))
    .run();
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到这部动画。" );
  await recordAudit(db, "admin", "update_anime", "anime", id, { before, patch });
}

export async function createAnime(db: D1Database, value: AnimeCreate): Promise<string> {
  const season = await db.prepare("SELECT id FROM seasons WHERE id = ?").bind(value.seasonId).first();
  if (!season) throw new HttpError(400, "季度不存在。");
  const id = createId("anime");
  try {
    await database(db).insert(animeTable).values({
      id,
      seasonId: value.seasonId,
      slug: value.slug,
      titleZh: value.titleZh,
      titleZhSourceUrl: value.titleZhSourceUrl ?? null,
      titleJa: value.titleJa,
      titleEn: value.titleEn ?? null,
      synopsis: value.synopsis,
      editorialNote: value.editorialNote ?? null,
      yuriKind: value.yuriKind,
      yuriStatus: value.yuriStatus,
      status: value.status,
      premiereAt: value.premiereAt,
      episodeCount: value.episodeCount ?? null,
      episodeDurationMin: value.episodeDurationMin ?? null,
      premiereEpisodeCount: value.premiereEpisodeCount ?? 1,
      latestVerifiedEpisode: value.latestVerifiedEpisode ?? null,
      latestEpisodeSourceUrl: value.latestEpisodeSourceUrl ?? null,
      latestEpisodeCheckedAt: value.latestEpisodeCheckedAt ?? null,
      studio: value.studio ?? null,
      sourceMaterial: value.sourceMaterial ?? null,
      officialUrl: value.officialUrl ?? null,
      bangumiUrl: value.bangumiUrl ?? null,
      officialXUrl: value.officialXUrl ?? null,
      coverUrl: value.coverUrl ?? null,
      coverSourceUrl: value.coverSourceUrl ?? null,
      mainCharacterSourceUrl: value.mainCharacterSourceUrl ?? null,
      mainCharacterExpectedCount: value.mainCharacterExpectedCount ?? null,
      mainCharacterCheckedAt: value.mainCharacterCheckedAt ?? null,
      visualTheme: value.visualTheme,
      featured: value.featured,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).run();
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) throw new HttpError(409, "作品 slug 已存在。");
    throw error;
  }
  await recordAudit(db, "admin", "create_anime", "anime", id, { after: value });
  return id;
}

async function ensureMedia(db: D1Database, draft: CandidateDraft): Promise<string | null> {
  if (!draft.media) return null;
  const existing = await db
    .prepare("SELECT id FROM media_items WHERE original_url = ?")
    .bind(draft.media.originalUrl)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const mediaId = createId("media");
  await db.prepare(`
    INSERT INTO media_items (
      id, anime_id, person_id, character_id, content_class, title,
      creator_name, creator_url, original_url, preview_url, presentation_mode,
      safety_rating, spoiler_level, rights_note, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    mediaId,
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
  ).run();
  return mediaId;
}

export async function createCandidate(db: D1Database, draft: CandidateDraft): Promise<string> {
  const fingerprint = await stableFingerprint(
    draft.originKey ?? `${draft.url}|${draft.title}|${draft.publishedAt}`,
  );
  const existing = draft.originKey
    ? await db.prepare("SELECT id FROM feed_candidates WHERE origin_key = ?")
        .bind(draft.originKey).first<{ id: string }>()
    : await db.prepare("SELECT id FROM feed_candidates WHERE fingerprint = ?")
        .bind(fingerprint).first<{ id: string }>();
  if (existing) {
    if (draft.observationId || draft.claimId) {
      await db.prepare(`
        INSERT OR IGNORE INTO candidate_evidence (
          id, candidate_id, observation_id, claim_id, relation
        ) VALUES (?, ?, ?, ?, 'supports')
      `).bind(createId("evidence"), existing.id, draft.observationId ?? null, draft.claimId ?? null).run();
    }
    return existing.id;
  }

  const id = createId("candidate");
  const mediaId = await ensureMedia(db, draft);
  await db.prepare(`
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
    draft.animeId ?? null,
    draft.personId ?? null,
    draft.characterId ?? null,
    draft.accountId ?? null,
    draft.platformObjectId ?? null,
    draft.originKey ?? null,
    mediaId,
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
  ).run();

  if (draft.observationId || draft.claimId) {
    await db.prepare(`
      INSERT OR IGNORE INTO candidate_evidence (
        id, candidate_id, observation_id, claim_id, relation
      ) VALUES (?, ?, ?, ?, 'supports')
    `).bind(createId("evidence"), id, draft.observationId ?? null, draft.claimId ?? null).run();
  }
  return id;
}

export type ReviewMetadata = {
  reviewerType: "llm" | "policy" | "admin" | "local_skill";
  confidence?: number;
  model?: string;
  promptVersion?: string;
  reasons?: string[];
  output?: unknown;
};

export async function applyCandidateDecision(
  db: D1Database,
  candidateId: string,
  decision: ReviewDecision,
  metadata: ReviewMetadata,
): Promise<void> {
  const candidate = await db
    .prepare(`
      SELECT fc.id, fc.anime_id, fc.content_class, fc.title, fc.url, fc.source_name,
        fc.published_at, fi.id AS feed_item_id, fi.withdrawn_at
      FROM feed_candidates fc
      LEFT JOIN feed_items fi ON fi.candidate_id = fc.id
      WHERE fc.id = ?
    `)
    .bind(candidateId)
    .first<{
      id: string;
      anime_id: string | null;
      content_class: CandidateDraft["contentClass"];
      title: string;
      url: string;
      source_name: string;
      published_at: string;
      feed_item_id: string | null;
      withdrawn_at: string | null;
    }>();
  if (!candidate) throw new HttpError(404, "没有找到这条候选。" );

  if (decision === "withdraw") {
    if (!candidate.feed_item_id) throw new HttpError(409, "这条动态尚未发布。");
    if (candidate.withdrawn_at) throw new HttpError(409, "这条动态已经撤回。");
    if (!metadata.reasons?.[0]?.trim()) throw new HttpError(400, "请填写撤回原因。");
  }

  const status = decision === "publish" || decision === "withdraw"
    ? "published"
    : decision === "hold" ? "held" : "rejected";
  const actorType = metadata.reviewerType === "policy" ? "system" : metadata.reviewerType;
  const statements: D1PreparedStatement[] = [
    db.prepare("UPDATE feed_candidates SET status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(status, candidateId),
    db.prepare(`
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
    ),
  ];
  if (decision === "publish") {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO feed_items (
        id, candidate_id, anime_id, person_id, character_id, account_id,
        platform_object_id, origin_key, event_id, media_id,
        content_class, source_identity, title, summary, url, source_name,
        source_account, importance, published_at, safety_rating, spoiler_level,
        auto_published
      )
      SELECT ?, id, anime_id, person_id, character_id, account_id,
        platform_object_id, origin_key, event_id, media_id,
        content_class, source_identity, title, summary, url, source_name,
        source_account, importance, published_at, safety_rating, spoiler_level, ?
      FROM feed_candidates WHERE id = ?
    `).bind(createId("feed"), metadata.reviewerType === "admin" ? 0 : 1, candidateId));
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
        SELECT id, ? FROM discussions WHERE url = ?
      `).bind(candidate.anime_id, candidate.url));
    }
  }
  if (decision === "withdraw") {
    statements.push(db.prepare(`
      INSERT INTO corrections (
        id, feed_item_id, correction_type, reason, replacement_feed_item_id, actor_type
      ) VALUES (?, ?, 'withdraw', ?, NULL, ?)
    `).bind(
      createId("correction"),
      candidate.feed_item_id,
      metadata.reasons?.[0]?.trim(),
      actorType,
    ));
    statements.push(db.prepare(`
      UPDATE feed_items SET withdrawn_at = CURRENT_TIMESTAMP WHERE candidate_id = ?
    `).bind(candidateId));
  }
  statements.push(auditStatement(db, actorType, "review_candidate", "feed_candidate", candidateId, {
    decision,
    reasons: metadata.reasons ?? [],
    feedItemId: candidate.feed_item_id,
  }));
  await db.batch(statements);
}
