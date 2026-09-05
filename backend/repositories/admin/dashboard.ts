import type {
  AdminDashboard,
  AdminDashboardView,
  AdminPublication,
  AuditEntry,
  FeedCandidate,
  ResearchRun,
  SourceHealth,
  UpdateJob,
} from "@/domain";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { mapAnime } from "~/infrastructure/db/mappers";
import { readAllAnimeSummaries } from "~/infrastructure/db/read-models/anime";
import { publicDiscussion } from "~/infrastructure/db/read-models/public-visibility";
import {
  animeTable,
  auditLogTable,
  candidateEvidenceTable,
  charactersTable,
  discussionsTable,
  feedCandidatesTable,
  feedItemsTable,
  peopleTable,
  researchRunsTable,
  researchSourcesTable,
  reviewDecisionsTable,
  updateJobsTable,
} from "~/infrastructure/db/schema";

type DashboardData = Omit<AdminDashboard, "coverage" | "seasons">;

function jsonStringArray(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function jsonObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function readCounts(db: D1Database): Promise<DashboardData["counts"]> {
  const orm = database(db);
  const [anime, held, sources, discussions, autoPublished] = await orm.batch([
    orm.select({ count: count() }).from(animeTable),
    orm.select({ count: count() }).from(feedCandidatesTable)
      .where(inArray(feedCandidatesTable.status, ["held", "pending"])),
    orm.select({ count: count() }).from(researchSourcesTable)
      .where(eq(researchSourcesTable.enabled, true)),
    orm.select({ count: count() }).from(discussionsTable)
      .where(and(eq(discussionsTable.isActive, true), publicDiscussion(db))),
    orm.select({ count: count() }).from(feedItemsTable)
      .where(and(eq(feedItemsTable.autoPublished, true), isNull(feedItemsTable.withdrawnAt))),
  ]);
  return {
    anime: anime[0]?.count ?? 0,
    held: held[0]?.count ?? 0,
    sources: sources[0]?.count ?? 0,
    activeDiscussions: discussions[0]?.count ?? 0,
    autoPublished: autoPublished[0]?.count ?? 0,
  };
}

export async function readHeldCandidates(db: D1Database): Promise<FeedCandidate[]> {
  const orm = database(db);
  const candidates = await orm.select({
    id: feedCandidatesTable.id,
    animeId: feedCandidatesTable.animeId,
    animeTitle: animeTable.titleZh,
    accountId: feedCandidatesTable.accountId,
    platformObjectId: feedCandidatesTable.platformObjectId,
    contentClass: feedCandidatesTable.contentClass,
    sourceIdentity: feedCandidatesTable.sourceIdentity,
    title: feedCandidatesTable.title,
    summary: feedCandidatesTable.summary,
    url: feedCandidatesTable.url,
    sourceName: feedCandidatesTable.sourceName,
    sourceAccount: feedCandidatesTable.sourceAccount,
    importance: feedCandidatesTable.importance,
    publishedAt: feedCandidatesTable.publishedAt,
    presentationMode: feedCandidatesTable.presentationMode,
    safetyRating: feedCandidatesTable.safetyRating,
    spoilerLevel: feedCandidatesTable.spoilerLevel,
    confidence: feedCandidatesTable.confidence,
    status: feedCandidatesTable.status,
    discoveredBy: feedCandidatesTable.discoveredBy,
    personName: peopleTable.name,
    characterName: charactersTable.name,
  }).from(feedCandidatesTable)
    .leftJoin(animeTable, eq(animeTable.id, feedCandidatesTable.animeId))
    .leftJoin(peopleTable, eq(peopleTable.id, feedCandidatesTable.personId))
    .leftJoin(charactersTable, eq(charactersTable.id, feedCandidatesTable.characterId))
    .where(inArray(feedCandidatesTable.status, ["held", "pending"]))
    .orderBy(desc(feedCandidatesTable.importance), desc(feedCandidatesTable.publishedAt))
    .limit(50);

  if (candidates.length === 0) return [];
  const ids = candidates.map(({ id }) => id);
  const [evidence, reviews] = await Promise.all([
    orm.select({ candidateId: candidateEvidenceTable.candidateId, count: count() })
      .from(candidateEvidenceTable)
      .where(inArray(candidateEvidenceTable.candidateId, ids))
      .groupBy(candidateEvidenceTable.candidateId),
    orm.select({ candidateId: reviewDecisionsTable.candidateId, reasonsJson: reviewDecisionsTable.reasonsJson })
      .from(reviewDecisionsTable)
      .where(inArray(reviewDecisionsTable.candidateId, ids))
      .orderBy(desc(reviewDecisionsTable.createdAt)),
  ]);
  const evidenceByCandidate = new Map(evidence.map((row) => [row.candidateId, row.count]));
  const reasonsByCandidate = new Map<string, string[]>();
  for (const review of reviews) {
    if (!reasonsByCandidate.has(review.candidateId)) {
      reasonsByCandidate.set(review.candidateId, jsonStringArray(review.reasonsJson));
    }
  }
  return candidates.map((candidate) => ({
    ...candidate,
    evidenceCount: evidenceByCandidate.get(candidate.id) ?? 0,
    reviewReasons: reasonsByCandidate.get(candidate.id) ?? [],
  }));
}

export async function readSources(db: D1Database): Promise<SourceHealth[]> {
  return database(db).select({
    id: researchSourcesTable.id,
    animeTitle: animeTable.titleZh,
    label: researchSourcesTable.label,
    sourceType: researchSourcesTable.sourceType,
    changeKind: researchSourcesTable.changeKind,
    trustLevel: researchSourcesTable.trustLevel,
    cadenceProfile: researchSourcesTable.cadenceProfile,
    url: researchSourcesTable.url,
    itemUrlTemplate: researchSourcesTable.itemUrlTemplate,
    pollIntervalMin: researchSourcesTable.pollIntervalMin,
    enabled: researchSourcesTable.enabled,
    nextCheckAt: researchSourcesTable.nextCheckAt,
    lastCheckedAt: researchSourcesTable.lastCheckedAt,
    failureCount: researchSourcesTable.failureCount,
    lastError: researchSourcesTable.lastError,
  }).from(researchSourcesTable)
    .leftJoin(animeTable, eq(animeTable.id, researchSourcesTable.animeId))
    .orderBy(desc(researchSourcesTable.enabled), desc(researchSourcesTable.failureCount), asc(researchSourcesTable.label));
}

export async function readRuns(db: D1Database): Promise<ResearchRun[]> {
  return database(db).select({
    id: researchRunsTable.id,
    triggerType: researchRunsTable.triggerType,
    status: researchRunsTable.status,
    sourceCount: researchRunsTable.sourceCount,
    observationCount: researchRunsTable.observationCount,
    candidateCount: researchRunsTable.candidateCount,
    publishedCount: researchRunsTable.publishedCount,
    heldCount: researchRunsTable.heldCount,
    rejectedCount: researchRunsTable.rejectedCount,
    jobCount: researchRunsTable.jobCount,
    message: researchRunsTable.message,
    startedAt: researchRunsTable.startedAt,
    finishedAt: researchRunsTable.finishedAt,
  }).from(researchRunsTable).orderBy(desc(researchRunsTable.startedAt)).limit(12);
}

export async function readJobs(db: D1Database): Promise<UpdateJob[]> {
  return database(db).select({
    id: updateJobsTable.id,
    jobType: updateJobsTable.jobType,
    scopeType: updateJobsTable.scopeType,
    scopeId: updateJobsTable.scopeId,
    executionTarget: updateJobsTable.executionTarget,
    status: updateJobsTable.status,
    priority: updateJobsTable.priority,
    attemptCount: updateJobsTable.attemptCount,
    scheduledAt: updateJobsTable.scheduledAt,
    leaseOwner: updateJobsTable.leaseOwner,
    leaseUntil: updateJobsTable.leaseUntil,
    lastHeartbeatAt: updateJobsTable.lastHeartbeatAt,
    lastError: updateJobsTable.lastError,
  }).from(updateJobsTable).orderBy(desc(updateJobsTable.createdAt)).limit(30);
}

export async function readPublications(db: D1Database): Promise<AdminPublication[]> {
  const rows = await database(db).select({
    id: feedItemsTable.id,
    candidateId: feedItemsTable.candidateId,
    animeTitle: animeTable.titleZh,
    title: feedItemsTable.title,
    url: feedItemsTable.url,
    sourceName: feedItemsTable.sourceName,
    publishedAt: feedItemsTable.publishedAt,
    autoPublished: feedItemsTable.autoPublished,
  }).from(feedItemsTable)
    .leftJoin(animeTable, eq(animeTable.id, feedItemsTable.animeId))
    .where(and(isNotNull(feedItemsTable.candidateId), isNull(feedItemsTable.withdrawnAt)))
    .orderBy(desc(feedItemsTable.createdAt))
    .limit(40);
  return rows.flatMap((row) => row.candidateId ? [{ ...row, candidateId: row.candidateId }] : []);
}

export async function readAudit(db: D1Database): Promise<AuditEntry[]> {
  const rows = await database(db).select().from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt)).limit(40);
  return rows.map((row) => ({
    id: row.id,
    actorType: row.actorType,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    detail: jsonObject(row.detailJson),
    createdAt: row.createdAt,
  }));
}

export async function readWorks(db: D1Database) {
  return (await readAllAnimeSummaries(db)).map(row => ({ ...mapAnime(row), seasonId: row.seasonId, seasonLabel: row.seasonLabel }));
}

export async function readAdminDashboardData(db: D1Database, view: AdminDashboardView = "all"): Promise<DashboardData> {
  const includes = (...views: AdminDashboardView[]) => view === "all" || views.includes(view);
  const [counts, animeRows, heldCandidates, sources, recentRuns, recentJobs, recentPublications, recentAudit] =
    await Promise.all([
      readCounts(db),
      includes("works") ? readWorks(db) : [],
      includes("review") ? readHeldCandidates(db) : [],
      includes("overview", "automation") ? readSources(db) : [],
      includes("overview", "automation") ? readRuns(db) : [],
      includes("overview", "automation") ? readJobs(db) : [],
      includes("review") ? readPublications(db) : [],
      includes("automation") ? readAudit(db) : [],
    ]);
  return {
    counts,
    anime: animeRows,
    heldCandidates,
    sources,
    recentRuns,
    recentJobs,
    recentPublications,
    recentAudit,
  };
}
