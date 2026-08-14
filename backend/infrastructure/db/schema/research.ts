import { sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const sourceObservationsTable = sqliteTable("source_observations", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  animeId: text("anime_id"),
  canonicalUrl: text("canonical_url").notNull(),
  sourceItemId: text("source_item_id"),
  title: text("title"),
  excerpt: text("excerpt"),
  publicText: text("public_text"),
  publicTranslation: text("public_translation"),
  authorName: text("author_name"),
  publishedAt: text("published_at"),
  capturedAt: text("captured_at").notNull(),
  connectorVersion: text("connector_version").notNull(),
  originalLanguage: text("original_language"),
  contentType: text("content_type"),
  httpStatus: integer("http_status"),
  contentHash: text("content_hash").notNull(),
  metadataJson: text("metadata_json").notNull(),
}, (table) => [unique().on(table.sourceId, table.contentHash)]);

export const researchRunsTable = sqliteTable("research_runs", {
  id: text("id").primaryKey(),
  externalBatchId: text("external_batch_id").unique(),
  triggerType: text("trigger_type", { enum: ["cron", "admin", "local_skill"] }).notNull(),
  status: text("status", { enum: ["running", "completed", "failed", "skipped"] }).notNull(),
  sourceCount: integer("source_count").notNull(),
  observationCount: integer("observation_count").notNull(),
  candidateCount: integer("candidate_count").notNull(),
  publishedCount: integer("published_count").notNull(),
  heldCount: integer("held_count").notNull(),
  rejectedCount: integer("rejected_count").notNull(),
  jobCount: integer("job_count").notNull(),
  message: text("message"),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
});

export const updateJobsTable = sqliteTable("update_jobs", {
  id: text("id").primaryKey(),
  jobType: text("job_type").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id"),
  researchRunId: text("research_run_id"),
  executionTarget: text("execution_target", { enum: ["worker", "local"] }).notNull(),
  status: text("status", { enum: ["planned", "leased", "running", "completed", "partial", "retry", "dead"] }).notNull(),
  priority: integer("priority").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  leaseUntil: text("lease_until"),
  leaseOwner: text("lease_owner"),
  leaseTokenHash: text("lease_token_hash"),
  lastHeartbeatAt: text("last_heartbeat_at"),
  completionKey: text("completion_key"),
  resultJson: text("result_json"),
  attemptCount: integer("attempt_count").notNull(),
  maxAttempts: integer("max_attempts").notNull(),
  budgetJson: text("budget_json").notNull(),
  inputJson: text("input_json").notNull(),
  dedupeKey: text("dedupe_key").notNull(),
  lastError: text("last_error"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull(),
});

export const claimsTable = sqliteTable("claims", {
  id: text("id").primaryKey(),
  observationId: text("observation_id").notNull(),
  animeId: text("anime_id"),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id"),
  predicate: text("predicate").notNull(),
  valueJson: text("value_json").notNull(),
  extractionMethod: text("extraction_method").notNull(),
  confidence: real("confidence").notNull(),
  status: text("status").notNull(),
  fingerprint: text("fingerprint").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedAt: text("resolved_at"),
});

export const feedCandidatesTable = sqliteTable("feed_candidates", {
  id: text("id").primaryKey(),
  observationId: text("observation_id"),
  animeId: text("anime_id"),
  personId: text("person_id"),
  characterId: text("character_id"),
  eventId: text("event_id"),
  mediaId: text("media_id"),
  accountId: text("account_id"),
  platformObjectId: text("platform_object_id"),
  originKey: text("origin_key"),
  contentClass: text("content_class", { enum: ["schedule", "official_news", "official_art", "creator_art", "birthday", "cast_post", "staff_post", "fanwork", "community_thread", "editorial"] }).notNull(),
  sourceIdentity: text("source_identity", { enum: ["official", "creator", "cast", "community", "editorial"] }).notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  url: text("url").notNull(),
  sourceName: text("source_name").notNull(),
  sourceAccount: text("source_account"),
  importance: integer("importance").notNull(),
  publishedAt: text("published_at").notNull(),
  presentationMode: text("presentation_mode", { enum: ["link_only", "platform_embed", "remote_preview", "mirrored_with_permission"] }).notNull(),
  safetyRating: text("safety_rating", { enum: ["safe", "suggestive", "adult", "unknown"] }).notNull(),
  spoilerLevel: text("spoiler_level", { enum: ["none", "mild", "major"] }).notNull(),
  confidence: real("confidence").notNull(),
  status: text("status", { enum: ["pending", "published", "held", "rejected"] }).notNull(),
  discoveredBy: text("discovered_by").notNull(),
  extractorVersion: text("extractor_version").notNull(),
  policyVersion: text("policy_version").notNull(),
  fingerprint: text("fingerprint").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text("reviewed_at"),
});

export const candidateEvidenceTable = sqliteTable("candidate_evidence", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  observationId: text("observation_id"),
  claimId: text("claim_id"),
  relation: text("relation", { enum: ["supports", "context", "conflicts"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [unique().on(table.candidateId, table.observationId, table.claimId, table.relation)]);

export const reviewDecisionsTable = sqliteTable("review_decisions", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  reviewerType: text("reviewer_type").notNull(),
  decision: text("decision").notNull(),
  confidence: real("confidence"),
  model: text("model"),
  promptVersion: text("prompt_version"),
  reasonsJson: text("reasons_json").notNull(),
  outputJson: text("output_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reviewCacheTable = sqliteTable("review_cache", {
  inputFingerprint: text("input_fingerprint").notNull(),
  promptVersion: text("prompt_version").notNull(),
  model: text("model").notNull(),
  outputJson: text("output_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.inputFingerprint, table.promptVersion, table.model] })]);

export const correctionsTable = sqliteTable("corrections", {
  id: text("id").primaryKey(),
  feedItemId: text("feed_item_id").notNull(),
  correctionType: text("correction_type", { enum: ["edit", "withdraw", "supersede"] }).notNull(),
  reason: text("reason").notNull(),
  replacementFeedItemId: text("replacement_feed_item_id"),
  actorType: text("actor_type").notNull(),
  createdAt: text("created_at").notNull(),
});

export const searchMemoryTable = sqliteTable("search_memory", {
  id: text("id").primaryKey(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id").notNull(),
  searchKind: text("search_kind").notNull(),
  targetKey: text("target_key").notNull(),
  queryText: text("query_text").notNull(),
  status: text("status").notNull(),
  cursorJson: text("cursor_json").notNull(),
  lastResultHash: text("last_result_hash"),
  lastResultCount: integer("last_result_count").notNull(),
  usefulResultCount: integer("useful_result_count").notNull(),
  lastSearchedAt: text("last_searched_at"),
  nextSearchAt: text("next_search_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [unique().on(table.scopeType, table.scopeId, table.searchKind, table.targetKey)]);

export const searchMemoryHitsTable = sqliteTable("search_memory_hits", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id").notNull(),
  canonicalUrl: text("canonical_url").notNull(),
  title: text("title"),
  contentHash: text("content_hash"),
  outcome: text("outcome").notNull(),
  observationId: text("observation_id"),
  candidateId: text("candidate_id"),
  metadataJson: text("metadata_json").notNull(),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
}, (table) => [unique().on(table.memoryId, table.canonicalUrl)]);

export const discussionAnimeTable = sqliteTable("discussion_anime", {
  discussionId: text("discussion_id").notNull(),
  animeId: text("anime_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.discussionId, table.animeId] })]);

export const candidateAnimeTable = sqliteTable("candidate_anime", {
  candidateId: text("candidate_id").notNull(),
  animeId: text("anime_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.candidateId, table.animeId] })]);
