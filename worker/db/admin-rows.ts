import type {
  CandidateStatus,
  ContentClass,
  PresentationMode,
  ResearchRun,
  SafetyRating,
  SourceHealth,
  SourceIdentity,
  SpoilerLevel,
  AdminPublication,
  AuditEntry,
} from "@/domain";

export type CandidateRow = {
  id: string;
  anime_id: string | null;
  anime_title: string | null;
  account_id: string | null;
  platform_object_id: string | null;
  content_class: ContentClass;
  source_identity: SourceIdentity;
  title: string;
  summary: string;
  url: string;
  source_name: string;
  source_account: string | null;
  importance: number;
  published_at: string;
  presentation_mode: PresentationMode;
  safety_rating: SafetyRating;
  spoiler_level: SpoilerLevel;
  confidence: number;
  status: CandidateStatus;
  discovered_by: string;
  person_name: string | null;
  character_name: string | null;
  evidence_count: number;
  review_reasons_json: string | null;
};

export type SourceRow = {
  id: string;
  anime_title: string | null;
  label: string;
  source_type: string;
  change_kind: SourceHealth["changeKind"];
  trust_level: string;
  cadence_profile: SourceHealth["cadenceProfile"];
  url: string;
  item_url_template: string | null;
  poll_interval_min: number;
  enabled: number;
  next_check_at: string | null;
  last_checked_at: string | null;
  failure_count: number;
  last_error: string | null;
};

export type ResearchRunRow = {
  id: string;
  trigger_type: ResearchRun["triggerType"];
  status: ResearchRun["status"];
  source_count: number;
  observation_count: number;
  candidate_count: number;
  published_count: number;
  held_count: number;
  rejected_count: number;
  job_count: number;
  message: string | null;
  started_at: string;
  finished_at: string | null;
};

export type UpdateJobRow = {
  id: string;
  job_type: string;
  scope_type: string;
  scope_id: string | null;
  execution_target: "worker" | "local";
  status: import("@/domain").UpdateJob["status"];
  priority: number;
  attempt_count: number;
  scheduled_at: string;
  lease_owner: string | null;
  lease_until: string | null;
  last_heartbeat_at: string | null;
  last_error: string | null;
};

export type PublicationRow = {
  id: string;
  candidate_id: string;
  anime_title: string | null;
  title: string;
  url: string;
  source_name: string;
  published_at: string;
  auto_published: number;
};

export type AuditRow = {
  id: string;
  actor_type: AuditEntry["actorType"];
  action: string;
  entity_type: string;
  entity_id: string;
  detail_json: string;
  created_at: string;
};

export type { AdminPublication };
