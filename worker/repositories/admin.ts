import type {
  AdminPublication,
  AuditEntry,
  AdminDashboard,
  FeedCandidate,
  ResearchRun,
  SourceHealth,
  UpdateJob,
} from "@/domain";
import type {
  AuditRow,
  CandidateRow,
  PublicationRow,
  ResearchRunRow,
  SourceRow,
  UpdateJobRow,
} from "../db/admin-rows";
import type { CountRow } from "../db/rows";
import { animeForSeason, readSeasons } from "./catalog";
import { readAdminCoverage } from "./admin-coverage";

function mapCandidate(row: CandidateRow): FeedCandidate {
  let reviewReasons: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.review_reasons_json ?? "[]");
    if (Array.isArray(parsed)) reviewReasons = parsed.filter((item): item is string => typeof item === "string");
  } catch { /* malformed historical review metadata should not break Admin */ }
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
    reviewReasons,
  };
}

function mapRun(row: ResearchRunRow): ResearchRun {
  return {
    id: row.id,
    triggerType: row.trigger_type,
    status: row.status,
    sourceCount: row.source_count,
    observationCount: row.observation_count,
    candidateCount: row.candidate_count,
    publishedCount: row.published_count,
    heldCount: row.held_count,
    rejectedCount: row.rejected_count,
    jobCount: row.job_count,
    message: row.message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function mapSource(row: SourceRow): SourceHealth {
  return {
    id: row.id,
    animeTitle: row.anime_title,
    label: row.label,
    sourceType: row.source_type,
    changeKind: row.change_kind,
    trustLevel: row.trust_level,
    cadenceProfile: row.cadence_profile,
    url: row.url,
    itemUrlTemplate: row.item_url_template,
    pollIntervalMin: row.poll_interval_min,
    enabled: row.enabled === 1,
    nextCheckAt: row.next_check_at,
    lastCheckedAt: row.last_checked_at,
    failureCount: row.failure_count,
    lastError: row.last_error,
  };
}

function mapJob(row: UpdateJobRow): UpdateJob {
  return {
    id: row.id,
    jobType: row.job_type,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    executionTarget: row.execution_target,
    status: row.status,
    priority: row.priority,
    attemptCount: row.attempt_count,
    scheduledAt: row.scheduled_at,
    leaseOwner: row.lease_owner,
    leaseUntil: row.lease_until,
    lastHeartbeatAt: row.last_heartbeat_at,
    lastError: row.last_error,
  };
}

function mapPublication(row: PublicationRow): AdminPublication {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    animeTitle: row.anime_title,
    title: row.title,
    url: row.url,
    sourceName: row.source_name,
    publishedAt: row.published_at,
    autoPublished: row.auto_published === 1,
  };
}

function parseAuditDetail(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function mapAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    actorType: row.actor_type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detail: parseAuditDetail(row.detail_json),
    createdAt: row.created_at,
  };
}

export async function readAdminDashboard(db: D1Database): Promise<AdminDashboard> {
  const seasonIndex = await readSeasons(db);
  const anime = (await Promise.all(seasonIndex.seasons.map(async (season) =>
    (await animeForSeason(db, season.id)).map((item) => ({
      ...item,
      seasonId: season.id,
      seasonLabel: season.label,
    }))))).flat();
  const [animeCount, heldCount, sourceCount, discussionCount, autoCount, coverage, held, sources, runs, jobs, publications, audits] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM anime").first<CountRow>(),
    db.prepare("SELECT COUNT(*) AS count FROM feed_candidates WHERE status IN ('held', 'pending')").first<CountRow>(),
    db.prepare("SELECT COUNT(*) AS count FROM research_sources WHERE enabled = 1").first<CountRow>(),
    db.prepare("SELECT COUNT(*) AS count FROM discussions WHERE is_active = 1").first<CountRow>(),
    db.prepare("SELECT COUNT(*) AS count FROM feed_items WHERE auto_published = 1 AND withdrawn_at IS NULL").first<CountRow>(),
    readAdminCoverage(db),
    db.prepare(`
      SELECT fc.*, a.title_zh AS anime_title, p.name AS person_name,
        c.name AS character_name,
        (SELECT COUNT(*) FROM candidate_evidence ce WHERE ce.candidate_id = fc.id) AS evidence_count,
        (SELECT rd.reasons_json FROM review_decisions rd
          WHERE rd.candidate_id = fc.id ORDER BY rd.created_at DESC LIMIT 1) AS review_reasons_json
      FROM feed_candidates fc
      LEFT JOIN anime a ON a.id = fc.anime_id
      LEFT JOIN people p ON p.id = fc.person_id
      LEFT JOIN characters c ON c.id = fc.character_id
      WHERE fc.status IN ('held', 'pending')
      ORDER BY fc.importance DESC, fc.published_at DESC LIMIT 50
    `).all<CandidateRow>(),
    db.prepare(`
      SELECT rs.id, a.title_zh AS anime_title, rs.label, rs.source_type, rs.change_kind,
        rs.trust_level, rs.cadence_profile, rs.url, rs.item_url_template, rs.poll_interval_min,
        rs.enabled, rs.next_check_at, rs.last_checked_at,
        rs.failure_count, rs.last_error
      FROM research_sources rs LEFT JOIN anime a ON a.id = rs.anime_id
      ORDER BY rs.enabled DESC, rs.failure_count DESC, rs.label
    `).all<SourceRow>(),
    db.prepare(`
      SELECT id, trigger_type, status, source_count, observation_count,
        candidate_count, published_count, held_count, rejected_count, job_count,
        message, started_at, finished_at
      FROM research_runs ORDER BY started_at DESC LIMIT 12
    `).all<ResearchRunRow>(),
    db.prepare(`
      SELECT id, job_type, scope_type, scope_id, execution_target, status,
        priority, attempt_count, scheduled_at, lease_owner, lease_until,
        last_heartbeat_at, last_error
      FROM update_jobs ORDER BY created_at DESC LIMIT 30
    `).all<UpdateJobRow>(),
    db.prepare(`
      SELECT fi.id, fi.candidate_id, a.title_zh AS anime_title, fi.title, fi.url,
        fi.source_name, fi.published_at, fi.auto_published
      FROM feed_items fi LEFT JOIN anime a ON a.id = fi.anime_id
      WHERE fi.withdrawn_at IS NULL AND fi.candidate_id IS NOT NULL
      ORDER BY fi.created_at DESC LIMIT 40
    `).all<PublicationRow>(),
    db.prepare(`
      SELECT id, actor_type, action, entity_type, entity_id, detail_json, created_at
      FROM audit_log ORDER BY created_at DESC LIMIT 40
    `).all<AuditRow>(),
  ]);
  return {
    counts: {
      anime: animeCount?.count ?? 0,
      held: heldCount?.count ?? 0,
      sources: sourceCount?.count ?? 0,
      activeDiscussions: discussionCount?.count ?? 0,
      autoPublished: autoCount?.count ?? 0,
    },
    anime,
    coverage,
    heldCandidates: held.results.map(mapCandidate),
    sources: sources.results.map(mapSource),
    recentRuns: runs.results.map(mapRun),
    recentJobs: jobs.results.map(mapJob),
    recentPublications: publications.results.map(mapPublication),
    recentAudit: audits.results.map(mapAudit),
    seasons: seasonIndex.seasons,
  };
}
