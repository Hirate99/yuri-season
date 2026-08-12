import type { CandidateDraft, ReviewDecision, ThemeSongWrite } from "./admin";

export type BatchReview = {
  decision: Exclude<ReviewDecision, "withdraw">;
  confidence: number;
  reasons: string[];
  model?: string;
  promptVersion?: string;
};

export type BatchCandidate = CandidateDraft & {
  review: BatchReview;
};

export type BatchThemeSong = Omit<ThemeSongWrite, "trackId" | "sourceUrl" | "verified"> & {
  animeId: string;
  review: BatchReview;
};

export type BatchInlineSource = {
  sourceType: "social" | "community";
  label: string;
  url: string;
  trustLevel: "community" | "unverified";
};

export type BatchAccountDiscovery = {
  animeId: string;
  personId: string;
  platform: "X" | "Instagram";
  handle?: string | null;
  url: string;
  verificationSourceUrl: string;
  review: BatchReview;
};

export type BatchObservation = {
  sourceId?: string | null;
  accountId?: string | null;
  source?: BatchInlineSource | null;
  sourceItemId?: string | null;
  canonicalUrl: string;
  title?: string | null;
  excerpt: string;
  authorName?: string | null;
  publishedAt?: string | null;
  contentType?: string;
  language?: string | null;
  metadata?: Record<string, unknown>;
  candidates: BatchCandidate[];
  accountDiscoveries?: BatchAccountDiscovery[];
  themeSongs?: BatchThemeSong[];
};

export type ResearchBatch = {
  schemaVersion: "1";
  batchId: string;
  createdAt: string;
  agent: string;
  scope: string;
  note?: string;
  observations: BatchObservation[];
};

export type BatchResult = {
  runId: string;
  duplicate: boolean;
  observations: number;
  candidates: number;
  published: number;
  held: number;
  rejected: number;
  resources: number;
};
