import type {
  BatchAccountDiscovery,
  BatchCandidate,
  BatchInlineSource,
  BatchObservation,
  BatchResult,
  CandidateDraft,
  ResearchBatch,
} from "@/domain";
import { parseResearchBatch } from "../api/batch-input";
import { parseThemeSong } from "../api/resource-content-input";
import { createId, HttpError } from "../http";
import { stableFingerprint } from "../lib/fingerprint";
import { applyCandidateDecision, createCandidate } from "../repositories/mutations";
import { upsertVerifiedThemeSongFromBatch } from "../repositories/admin-theme-song-mutations";
import { recordAudit } from "../repositories/audit";
import { rememberSearch, resolveSearchHit } from "../repositories/search-memory";
import type { SourceRecord } from "./types";
import { readBatchSource } from "./sources";

function isDeterministicCommunityCandidate(candidate: BatchCandidate, observation: BatchObservation) {
  if (candidate.contentClass !== "community_thread" || candidate.sourceIdentity !== "community") return false;
  if (observation.metadata?.bodyCopied !== false || observation.metadata?.originalOpened !== true) return false;
  const replies = Number(observation.metadata?.repliesObserved ?? 0);
  const views = Number(observation.metadata?.viewsObserved ?? 0);
  return observation.metadata?.hotMarker === true
    || observation.metadata?.sustainedRecentActivity === true
    || replies >= 10
    || views >= 500;
}

function localPolicy(candidate: BatchCandidate, source: SourceRecord, observation: BatchObservation) {
  const reasons = [...candidate.review.reasons];
  if (candidate.contentClass === "editorial") {
    return { decision: "reject" as const, reasons: [...reasons, "站点编辑、抓取差异与运维信息不进入公开情报流或待复核队列"] };
  }
  if (candidate.review.decision !== "publish") return { decision: candidate.review.decision, reasons };
  if (candidate.contentClass === "fanwork") {
    return { decision: "hold" as const, reasons: [...reasons, "新发现同人必须由 Admin 复核原作者、分级与作品关联"] };
  }
  if ((candidate.safetyRating ?? "unknown") !== "safe") return { decision: "hold" as const, reasons: [...reasons, "安全分级未达到自动发布条件"] };
  if ((candidate.spoilerLevel ?? "none") === "major") return { decision: "hold" as const, reasons: [...reasons, "重大剧透不自动发布"] };
  if ((candidate.presentationMode ?? "link_only") !== "link_only") return { decision: "hold" as const, reasons: [...reasons, "本地批次首阶段只允许原链展示"] };
  const deterministicCommunity = source.trust_level === "community"
    && isDeterministicCommunityCandidate(candidate, observation);
  if (["community", "unverified"].includes(source.trust_level) && !deterministicCommunity) {
    return { decision: "hold" as const, reasons: [...reasons, "社区与未验证来源需要人工复核"] };
  }
  const threshold = source.trust_level === "official" ? 0.88 : 0.92;
  if (candidate.review.confidence < threshold) return { decision: "hold" as const, reasons: [...reasons, `置信度低于 ${threshold}`] };
  return { decision: "publish" as const, reasons };
}

type ResolvedAccount = {
  id: string;
  owner_type: "anime" | "person" | "organization";
  owner_id: string;
  owner_name: string;
  platform: string;
  handle: string | null;
  url: string;
  verified: number;
};

async function readAccount(db: D1Database, accountId: string): Promise<ResolvedAccount | null> {
  return db.prepare(`
    SELECT ac.id, ac.owner_type, ac.owner_id,
      COALESCE(p.name, a.title_zh, ac.handle, ac.platform) AS owner_name,
      ac.platform, ac.handle, ac.url, ac.verified
    FROM accounts ac
    LEFT JOIN people p ON ac.owner_type = 'person' AND p.id = ac.owner_id
    LEFT JOIN anime a ON ac.owner_type = 'anime' AND a.id = ac.owner_id
    WHERE ac.id = ?
  `).bind(accountId).first<ResolvedAccount>();
}

async function ensureAccountSource(db: D1Database, account: ResolvedAccount): Promise<SourceRecord> {
  const existing = await db.prepare(`
    SELECT id FROM research_sources
    WHERE account_id = ? AND source_type = 'social'
    ORDER BY enabled DESC, id LIMIT 1
  `).bind(account.id).first<{ id: string }>();
  if (existing) {
    const source = await readBatchSource(db, existing.id);
    if (source) return source;
  }
  const urlMatch = await db.prepare("SELECT id, account_id FROM research_sources WHERE url = ?")
    .bind(account.url).first<{ id: string; account_id: string | null }>();
  if (urlMatch) {
    if (urlMatch.account_id !== account.id) throw new HttpError(409, "账号主页已绑定到另一个来源主体。" );
    const source = await readBatchSource(db, urlMatch.id);
    if (source) return source;
  }
  const sourceId = createId("source");
  await db.prepare(`
    INSERT INTO research_sources (
      id, anime_id, account_id, source_type, change_kind, label, url,
      trust_level, poll_interval_min, cadence_profile, enabled, failure_count
    ) VALUES (?, NULL, ?, 'social', 'feed_candidate', ?, ?,
      'verified_creator', 10080, 'local', 0, 0)
  `).bind(sourceId, account.id, `${account.owner_name} ${account.platform}`, account.url).run();
  const source = await readBatchSource(db, sourceId);
  if (!source) throw new HttpError(500, "无法建立账号来源。" );
  return source;
}

async function ensureInlineSource(db: D1Database, input: BatchInlineSource): Promise<SourceRecord> {
  const url = input.url;
  const existing = await db.prepare("SELECT id FROM research_sources WHERE url = ?")
    .bind(url).first<{ id: string }>();
  if (existing) {
    const source = await readBatchSource(db, existing.id);
    if (source) return source;
  }
  const sourceId = createId("source");
  await db.prepare(`
    INSERT INTO research_sources (
      id, anime_id, account_id, source_type, change_kind, label, url,
      trust_level, poll_interval_min, cadence_profile, enabled, failure_count
    ) VALUES (?, NULL, NULL, ?, 'feed_candidate', ?, ?, ?, 10080, 'local', 0, 0)
  `).bind(
    sourceId,
    input.sourceType,
    input.label,
    url,
    input.trustLevel,
  ).run();
  const source = await readBatchSource(db, sourceId);
  if (!source) throw new HttpError(500, "无法建立内联来源。" );
  return source;
}

async function resolveObservationSource(db: D1Database, observation: BatchObservation): Promise<SourceRecord> {
  if (observation.sourceId) {
    const source = await readBatchSource(db, observation.sourceId);
    if (!source) throw new HttpError(400, `来源 ${observation.sourceId} 不存在。`);
    return source;
  }
  if (observation.accountId) {
    const account = await readAccount(db, observation.accountId);
    if (!account?.verified) throw new HttpError(400, "账号 observation 必须引用已验证账号。" );
    return ensureAccountSource(db, account);
  }
  if (observation.source) return ensureInlineSource(db, observation.source);
  throw new HttpError(400, "observation 缺少来源。" );
}

function searchKind(source: SourceRecord) {
  if (source.change_kind === "catalog_metadata") return "catalog" as const;
  if (source.source_type === "community" || source.trust_level === "community") return "community" as const;
  if (source.source_type === "social") return "social" as const;
  return "official_news" as const;
}

function normalizedPlatformObjectId(candidate: BatchCandidate, observation: BatchObservation): string | null {
  const value = candidate.platformObjectId ?? observation.sourceItemId;
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 240) : null;
}

function accountMatchesPostUrl(account: ResolvedAccount, value: string): boolean {
  const post = new URL(value);
  const home = new URL(account.url);
  const platform = account.platform.toLowerCase();
  if (platform === "x" || platform === "twitter") {
    const allowed = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
    if (!allowed.has(post.hostname.toLowerCase())) return false;
    const expected = home.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    const actual = post.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    return Boolean(expected && actual && expected === actual);
  }
  if (platform === "instagram") {
    return ["instagram.com", "www.instagram.com"].includes(post.hostname.toLowerCase());
  }
  return post.hostname.toLowerCase() === home.hostname.toLowerCase();
}

async function prepareCandidate(
  db: D1Database,
  candidate: BatchCandidate,
  observation: BatchObservation,
  source: SourceRecord,
  observationId: string,
): Promise<CandidateDraft> {
  const animeId = candidate.animeId ?? candidate.animeIds?.[0] ?? source.anime_id;
  const common: CandidateDraft = {
    ...candidate,
    observationId,
    animeId,
    sourceIdentity: source.source_identity
      ?? (source.trust_level === "official" ? "official" : source.trust_level === "verified_creator" ? "creator" : "community"),
    sourceName: source.label,
    presentationMode: "link_only",
    discoveredBy: "local_skill",
    extractorVersion: "local-codex@2",
  };

  if (candidate.contentClass === "cast_post") {
    if (!animeId || !candidate.personId || !candidate.accountId) {
      throw new HttpError(400, "声优动态必须提供 animeId、personId 与 accountId。" );
    }
    const account = await readAccount(db, candidate.accountId);
    if (!account?.verified || account.owner_type !== "person" || account.owner_id !== candidate.personId) {
      throw new HttpError(400, "声优动态必须引用属于该声优的已验证账号。" );
    }
    if (source.account_id !== account.id) {
      throw new HttpError(400, "声优动态 observation 必须由同一个已验证账号作为来源。" );
    }
    if (!accountMatchesPostUrl(account, candidate.url)) {
      throw new HttpError(400, "声优动态原帖与已验证账号平台不匹配。" );
    }
    const credit = candidate.characterId
      ? await db.prepare(`
          SELECT id FROM cast_credits
          WHERE anime_id = ? AND person_id = ? AND character_id = ?
        `).bind(animeId, candidate.personId, candidate.characterId).first<{ id: string }>()
      : await db.prepare(`
          SELECT id FROM cast_credits WHERE anime_id = ? AND person_id = ? LIMIT 1
        `).bind(animeId, candidate.personId).first<{ id: string }>();
    if (!credit) throw new HttpError(400, "声优动态没有命中本作的角色—声优关系。" );
    const platformObjectId = normalizedPlatformObjectId(candidate, observation);
    if (!platformObjectId) throw new HttpError(400, "声优动态必须提供稳定的平台帖子 ID。" );
    return {
      ...common,
      accountId: account.id,
      platformObjectId,
      originKey: `cast:${animeId}:${account.id}:${platformObjectId}`,
      sourceIdentity: "cast",
      sourceName: account.owner_name,
      sourceAccount: account.handle,
    };
  }

  if (candidate.contentClass === "fanwork") {
    if (!animeId || !candidate.media?.creatorName?.trim() || !candidate.media.originalUrl) {
      throw new HttpError(400, "同人候选必须提供作品、原作者和原始发布链接。" );
    }
    if (!["fanart", "fan_video", "cosplay"].includes(candidate.media.contentClass)) {
      throw new HttpError(400, "同人候选的 media 类别必须是 fanart、fan_video 或 cosplay。" );
    }
    const originalUrl = candidate.media.originalUrl;
    if (candidate.url !== originalUrl) {
      throw new HttpError(400, "同人候选 URL 必须等于原作者的原始发布链接。" );
    }
    const platformObjectId = normalizedPlatformObjectId(candidate, observation) ?? originalUrl;
    const originHash = await stableFingerprint(`${platformObjectId}|${originalUrl}`);
    return {
      ...common,
      platformObjectId,
      originKey: `fanwork:${originHash}`,
      sourceIdentity: "community",
      sourceName: candidate.media.creatorName.trim(),
      sourceAccount: null,
      media: {
        ...candidate.media,
        originalUrl,
        presentationMode: "link_only",
      },
    };
  }

  return common;
}

async function storeAccountDiscovery(
  db: D1Database,
  observationId: string,
  value: BatchAccountDiscovery,
): Promise<boolean> {
  const animeId = value.animeId;
  const personId = value.personId;
  const credit = await db.prepare(`
    SELECT id FROM cast_credits WHERE anime_id = ? AND person_id = ? LIMIT 1
  `).bind(animeId, personId).first<{ id: string }>();
  if (!credit) throw new HttpError(400, "账号发现没有命中本作的声优关系。" );
  const url = value.url;
  const verificationSourceUrl = value.verificationSourceUrl;
  const claimValue = {
    animeId,
    personId,
    platform: value.platform,
    handle: value.handle?.trim() || null,
    url,
    verificationSourceUrl,
    review: value.review,
  };
  const fingerprint = await stableFingerprint(`account_identity|${personId}|${value.platform}|${url}`);
  const priorClaim = await db.prepare("SELECT id FROM claims WHERE fingerprint = ?")
    .bind(fingerprint).first<{ id: string }>();
  if (priorClaim) return false;

  const existing = await db.prepare("SELECT id, owner_type, owner_id FROM accounts WHERE url = ?")
    .bind(url).first<{ id: string; owner_type: string; owner_id: string }>();
  if (existing && (existing.owner_type !== "person" || existing.owner_id !== personId)) {
    throw new HttpError(409, "发现的账号 URL 已归属于另一个主体。" );
  }
  const rejected = value.review.decision === "reject";
  const accountId = existing?.id ?? (rejected ? null : createId("account"));
  if (!existing && accountId) {
    await db.prepare(`
      INSERT INTO accounts (
        id, owner_type, owner_id, platform, handle, url, verified, monitor_mode,
        verification_source_url, verified_at
      ) VALUES (?, 'person', ?, ?, ?, ?, 0, 'local', ?, NULL)
    `).bind(
      accountId,
      personId,
      value.platform,
      value.handle?.trim() || null,
      url,
      verificationSourceUrl,
    ).run();
  }
  await db.prepare(`
    INSERT INTO claims (
      id, observation_id, anime_id, subject_type, subject_id, predicate,
      value_json, extraction_method, confidence, status, fingerprint
    ) VALUES (?, ?, ?, 'account', ?, 'account_identity', ?, 'local_skill', ?, ?, ?)
  `).bind(
    createId("claim"),
    observationId,
    animeId,
    accountId,
    JSON.stringify(claimValue),
    value.review.confidence,
    rejected ? "rejected" : "proposed",
    fingerprint,
  ).run();
  return Boolean(!existing && accountId);
}

async function rememberBatchEvidence(
  db: D1Database,
  batch: ResearchBatch,
  source: SourceRecord,
  observation: BatchObservation,
  observationId: string,
  contentHash: string,
): Promise<void> {
  const matched = await resolveSearchHit(db, observation.canonicalUrl, "seen", { observationId });
  if (matched > 0) return;
  await rememberSearch(db, [{
    scopeType: "source",
    scopeId: source.id,
    searchKind: searchKind(source),
    targetKey: observation.canonicalUrl,
    queryText: observation.canonicalUrl,
    status: "active",
    cursor: {},
    lastResultHash: contentHash,
    lastResultCount: 1,
    usefulResultCount: observation.candidates.length > 0 || (observation.themeSongs?.length ?? 0) > 0 ? 1 : 0,
    searchedAt: batch.createdAt,
    nextSearchAt: null,
    notes: "批次证据未出现在登记来源的规范化结果中。",
    hits: [{
      canonicalUrl: observation.canonicalUrl,
      title: observation.title ?? null,
      contentHash,
      outcome: "seen",
      observationId,
      metadata: {
        sourceItemId: observation.sourceItemId ?? null,
        publishedAt: observation.publishedAt ?? null,
        discoveredBy: batch.agent,
      },
    }],
  }]);
}

export async function ingestResearchBatch(db: D1Database, input: unknown): Promise<BatchResult> {
  const batch = parseResearchBatch(input);

  const previous = await db.prepare("SELECT id, status FROM research_runs WHERE external_batch_id = ?")
    .bind(batch.batchId).first<{ id: string; status: "running" | "completed" | "failed" | "skipped" }>();
  if (previous?.status === "completed") {
    return { runId: previous.id, duplicate: true, observations: 0, candidates: 0, published: 0, held: 0, rejected: 0, resources: 0 };
  }
  if (previous?.status === "running") {
    throw new HttpError(409, "同一批次仍在处理中。" );
  }

  const runId = previous?.id ?? createId("run");
  const result: BatchResult = { runId, duplicate: false, observations: 0, candidates: 0, published: 0, held: 0, rejected: 0, resources: 0 };
  const message = JSON.stringify({ agent: batch.agent, scope: batch.scope, note: batch.note });
  if (previous) {
    await db.prepare(`
      UPDATE research_runs SET
        status = 'running', source_count = 0, observation_count = 0,
        candidate_count = 0, published_count = 0, held_count = 0,
        rejected_count = 0, job_count = 0, message = ?,
        started_at = CURRENT_TIMESTAMP, finished_at = NULL
      WHERE id = ?
    `).bind(message, runId).run();
  } else {
    await db.prepare(`
      INSERT INTO research_runs (
        id, external_batch_id, trigger_type, status, message, started_at
      ) VALUES (?, ?, 'local_skill', 'running', ?, CURRENT_TIMESTAMP)
    `).bind(runId, batch.batchId, message).run();
  }

  try {
    for (const observation of batch.observations) {
      const source = await resolveObservationSource(db, observation);
      const contentHash = await stableFingerprint(`${observation.sourceItemId ?? observation.canonicalUrl}|${observation.excerpt}`);
      const existing = await db.prepare(`
        SELECT id FROM source_observations WHERE source_id = ? AND content_hash = ?
      `).bind(source.id, contentHash).first<{ id: string }>();
      const observationId = existing?.id ?? createId("observation");
      if (!existing) {
        const relatedAnime = new Set([
          ...observation.candidates.map((candidate) => candidate.animeId).filter((id): id is string => Boolean(id)),
          ...observation.candidates.flatMap((candidate) => candidate.animeIds ?? []),
          ...(observation.accountDiscoveries ?? []).map((discovery) => discovery.animeId),
        ]);
        const observationAnimeId = source.anime_id ?? (relatedAnime.size === 1 ? [...relatedAnime][0] : null);
        await db.prepare(`
          INSERT INTO source_observations (
            id, source_id, anime_id, canonical_url, source_item_id, title, excerpt,
            author_name, published_at, connector_version, original_language,
            content_type, http_status, content_hash, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local-codex@1', ?, ?, 200, ?, ?)
        `).bind(
          observationId, source.id, observationAnimeId, observation.canonicalUrl,
          observation.sourceItemId ?? null, observation.title ?? null, observation.excerpt,
          observation.authorName ?? null, observation.publishedAt ?? null,
          observation.language ?? null, observation.contentType ?? "text/plain",
          contentHash, JSON.stringify(observation.metadata ?? {}),
        ).run();
        result.observations += 1;
      }
      await rememberBatchEvidence(db, batch, source, observation, observationId, contentHash);

      for (const discovery of observation.accountDiscoveries ?? []) {
        if (await storeAccountDiscovery(db, observationId, discovery)) result.resources += 1;
        await resolveSearchHit(db, observation.canonicalUrl, "held", { observationId });
      }

      for (const candidate of observation.candidates) {
        const draft = await prepareCandidate(db, candidate, observation, source, observationId);
        const candidateId = await createCandidate(db, draft);
        const evidenceUrls = new Set([observation.canonicalUrl, candidate.url]);
        for (const url of evidenceUrls) {
          await resolveSearchHit(db, url, "candidate", { observationId, candidateId });
        }
        const policy = localPolicy(candidate, source, observation);
        await applyCandidateDecision(db, candidateId, policy.decision, {
          reviewerType: "local_skill",
          confidence: candidate.review.confidence,
          model: candidate.review.model,
          promptVersion: candidate.review.promptVersion ?? "local-review@1",
          reasons: policy.reasons,
          output: candidate.review,
        });
        const outcome = policy.decision === "publish"
          ? "published"
          : policy.decision === "reject"
            ? "rejected"
            : "held";
        for (const url of evidenceUrls) {
          await resolveSearchHit(db, url, outcome, { observationId, candidateId });
        }
        result.candidates += 1;
        result[policy.decision === "publish" ? "published" : policy.decision === "reject" ? "rejected" : "held"] += 1;
      }
      for (const song of observation.themeSongs ?? []) {
        if (source.trust_level !== "official" || source.anime_id !== song.animeId) {
          throw new HttpError(400, "Theme-song automation requires a matching first-party work source.");
        }
        if (song.review.decision !== "publish" || song.review.confidence < 0.92) continue;
        const value = parseThemeSong({
          ...song,
          sourceUrl: observation.canonicalUrl,
          verified: true,
        });
        const stored = await upsertVerifiedThemeSongFromBatch(db, song.animeId, value);
        if (stored.created) result.resources += 1;
        await recordAudit(db, "local_skill", stored.created ? "create_resource" : "verify_resource", "theme_song", stored.id, {
          animeId: song.animeId,
          sourceUrl: observation.canonicalUrl,
          review: song.review,
        });
        await resolveSearchHit(db, observation.canonicalUrl, "published", { observationId });
      }
    }
    await db.prepare(`
      UPDATE research_runs SET status = 'completed', observation_count = ?, candidate_count = ?,
        published_count = ?, held_count = ?, rejected_count = ?, finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(result.observations, result.candidates, result.published, result.held, result.rejected, runId).run();
    await db.prepare(`
      INSERT INTO audit_log (id, actor_type, action, entity_type, entity_id, detail_json)
      VALUES (?, 'local_skill', 'ingest_batch', 'research_run', ?, ?)
    `).bind(createId("audit"), runId, JSON.stringify(result)).run();
    return result;
  } catch (error) {
    await db.prepare(`UPDATE research_runs SET status = 'failed', message = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800), runId).run();
    throw error;
  }
}
