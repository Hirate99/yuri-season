import type {
  AdminPublication,
  AuditEntry,
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

export function mapPublication(row: PublicationRow): AdminPublication {
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

export function mapAudit(row: AuditRow): AuditEntry {
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

export function mapRun(row: ResearchRunRow): ResearchRun {
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

export function mapSource(row: SourceRow): SourceHealth {
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

export function mapJob(row: UpdateJobRow): UpdateJob {
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
