import type {
  AuditRow,
  CandidateRow,
  PublicationRow,
  ResearchRunRow,
  SourceRow,
  UpdateJobRow,
} from "../admin-rows";
import { defineQuery } from "../query";

export type DashboardCountsRow = {
  anime_count: number;
  held_count: number;
  source_count: number;
  discussion_count: number;
  auto_count: number;
};

export const dashboardCountsQuery = defineQuery<DashboardCountsRow>(`
  SELECT
    (SELECT COUNT(*) FROM anime) AS anime_count,
    (SELECT COUNT(*) FROM feed_candidates WHERE status IN ('held', 'pending')) AS held_count,
    (SELECT COUNT(*) FROM research_sources WHERE enabled = 1) AS source_count,
    (SELECT COUNT(*) FROM discussions WHERE is_active = 1) AS discussion_count,
    (SELECT COUNT(*) FROM feed_items WHERE auto_published = 1 AND withdrawn_at IS NULL) AS auto_count
`);

export const heldCandidatesQuery = defineQuery<CandidateRow>(`
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
  ORDER BY fc.importance DESC, fc.published_at DESC
  LIMIT 50
`);

export const sourcesQuery = defineQuery<SourceRow>(`
  SELECT rs.id, a.title_zh AS anime_title, rs.label, rs.source_type, rs.change_kind,
    rs.trust_level, rs.cadence_profile, rs.url, rs.item_url_template, rs.poll_interval_min,
    rs.enabled, rs.next_check_at, rs.last_checked_at,
    rs.failure_count, rs.last_error
  FROM research_sources rs
  LEFT JOIN anime a ON a.id = rs.anime_id
  ORDER BY rs.enabled DESC, rs.failure_count DESC, rs.label
`);

export const researchRunsQuery = defineQuery<ResearchRunRow>(`
  SELECT id, trigger_type, status, source_count, observation_count,
    candidate_count, published_count, held_count, rejected_count, job_count,
    message, started_at, finished_at
  FROM research_runs
  ORDER BY started_at DESC
  LIMIT 12
`);

export const updateJobsQuery = defineQuery<UpdateJobRow>(`
  SELECT id, job_type, scope_type, scope_id, execution_target, status,
    priority, attempt_count, scheduled_at, lease_owner, lease_until,
    last_heartbeat_at, last_error
  FROM update_jobs
  ORDER BY created_at DESC
  LIMIT 30
`);

export const publicationsQuery = defineQuery<PublicationRow>(`
  SELECT fi.id, fi.candidate_id, a.title_zh AS anime_title, fi.title, fi.url,
    fi.source_name, fi.published_at, fi.auto_published
  FROM feed_items fi
  LEFT JOIN anime a ON a.id = fi.anime_id
  WHERE fi.withdrawn_at IS NULL AND fi.candidate_id IS NOT NULL
  ORDER BY fi.created_at DESC
  LIMIT 40
`);

export const auditLogQuery = defineQuery<AuditRow>(`
  SELECT id, actor_type, action, entity_type, entity_id, detail_json, created_at
  FROM audit_log
  ORDER BY created_at DESC
  LIMIT 40
`);
