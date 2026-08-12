import type { ResearchRun, SourceHealth, UpdateJob } from "@/domain";
import type { ResearchRunRow, SourceRow, UpdateJobRow } from "../db/admin-rows";

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
