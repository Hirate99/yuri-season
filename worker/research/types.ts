import type {
  ContentClass,
  SafetyRating,
  SourceIdentity,
  SpoilerLevel,
} from "@/domain";

export type SourceTrust = "official" | "verified_creator" | "community" | "unverified";
export type JobLane = "rapid" | "standard" | "discovery";

export type SourceRecord = {
  id: string;
  anime_id: string | null;
  anime_title: string | null;
  account_id?: string | null;
  account_owner_type?: "anime" | "person" | "organization" | null;
  account_owner_id?: string | null;
  account_platform?: string | null;
  account_handle?: string | null;
  account_verified?: number | null;
  source_identity?: SourceIdentity;
  source_type: string;
  change_kind: "catalog_metadata" | "feed_candidate";
  label: string;
  url: string;
  item_url_template: string | null;
  trust_level: SourceTrust;
  cadence_profile: "rapid" | "standard" | "local";
  poll_interval_min: number;
  etag: string | null;
  last_modified: string | null;
  cursor: string | null;
};

export type NormalizedSource = {
  sourceItemId: string | null;
  canonicalUrl: string;
  title: string | null;
  excerpt: string;
  authorName: string | null;
  publishedAt: string | null;
  contentHash: string;
  contentType: string;
  language: string | null;
  metadata: Record<string, unknown>;
};

export type FetchedSource = {
  items: NormalizedSource[];
  etag: string | null;
  lastModified: string | null;
  status: number;
};

export type SourceTransport = (url: string, init: RequestInit) => Promise<Response>;

export type ReviewContext = {
  candidateId: string;
  animeTitle: string | null;
  sourceLabel: string;
  sourceTrust: SourceTrust;
  sourceIdentity: SourceIdentity;
  currentTitle: string;
  currentSummary: string;
  url: string;
  excerpt: string;
  hasMedia: boolean;
  presentationMode: string;
  creatorName: string | null;
};

export type LlmReview = {
  decision: "publish" | "hold" | "reject";
  contentClass: ContentClass;
  title: string;
  summary: string;
  importance: number;
  safetyRating: SafetyRating;
  spoilerLevel: SpoilerLevel;
  confidence: number;
  reasons: string[];
};

export type RunCounters = {
  sources: number;
  observations: number;
  candidates: number;
  published: number;
  held: number;
  rejected: number;
};

export type UpdateJobRow = {
  id: string;
  job_type: string;
  scope_type: string;
  scope_id: string | null;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  input_json: string;
};
