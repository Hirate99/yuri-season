export type SearchMemoryOutcome =
  "seen" | "candidate" | "published" | "held" | "rejected" | "ignored";

export type SearchMemoryHitWrite = {
  canonicalUrl: string;
  title: string | null;
  contentHash: string | null;
  outcome: SearchMemoryOutcome;
  observationId?: string | null;
  candidateId?: string | null;
  metadata?: Record<string, unknown>;
};

export type SearchMemoryWrite = {
  scopeType: "season" | "anime" | "person" | "character" | "source" | "global";
  scopeId: string;
  searchKind:
    | "registered_source"
    | "official_news"
    | "social"
    | "birthday"
    | "media"
    | "community"
    | "catalog";
  targetKey: string;
  queryText: string;
  status: "active" | "exhausted" | "blocked";
  cursor?: Record<string, unknown>;
  lastResultHash: string | null;
  lastResultCount: number;
  usefulResultCount: number;
  searchedAt: string;
  nextSearchAt?: string | null;
  notes?: string | null;
  hits: SearchMemoryHitWrite[];
};

export type SearchMemorySummary = Omit<SearchMemoryWrite, "hits" | "cursor"> & {
  id: string;
  cursor?: Record<string, unknown>;
  seenCount: number;
  candidateCount: number;
  publishedCount: number;
  heldCount: number;
  rejectedCount: number;
  ignoredCount: number;
};

export type SearchMemoryHitSummary = {
  memoryId: string;
  canonicalUrl: string;
  title: string | null;
  contentHash: string | null;
  outcome: SearchMemoryOutcome;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type SearchMemoryResponse = {
  records: SearchMemorySummary[];
  hits?: SearchMemoryHitSummary[];
};
