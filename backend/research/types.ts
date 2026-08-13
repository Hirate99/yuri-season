import type {
  ContentClass,
  LocalJobOutcome,
  SafetyRating,
  SourceIdentity,
  SpoilerLevel,
} from "@/domain";

export type CompleteLocalJobInput = {
  leaseToken: string;
  idempotencyKey: string;
  outcome: LocalJobOutcome;
  runId: string | null;
  message: string | null;
  result: Record<string, unknown>;
};

export type SourceTrust = "official" | "verified_creator" | "community" | "unverified";
export type JobLane = "rapid" | "standard" | "discovery";

export type SourceRecord = {
  id: string;
  animeId: string | null;
  animeTitle: string | null;
  accountId?: string | null;
  accountOwnerType?: "anime" | "person" | "organization" | null;
  accountOwnerId?: string | null;
  accountPlatform?: string | null;
  accountHandle?: string | null;
  accountVerified?: boolean | null;
  sourceIdentity?: SourceIdentity;
  sourceType: string;
  changeKind: "catalog_metadata" | "feed_candidate";
  label: string;
  url: string;
  itemUrlTemplate: string | null;
  trustLevel: SourceTrust;
  cadenceProfile: "rapid" | "standard" | "local";
  pollIntervalMin: number;
  etag: string | null;
  lastModified: string | null;
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
  research_run_id: string;
  lease_token_hash: string;
};
