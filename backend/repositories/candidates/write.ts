import type { CandidateDraft } from "@/domain";
import type { BatchItem } from "drizzle-orm/batch";
import { and, eq, ne, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import {
  candidateAnimeTable,
  candidateEvidenceTable,
  feedCandidatesTable,
  mediaItemsTable,
} from "~/infrastructure/db/schema";
import { stableFingerprint } from "~/shared/fingerprint";
import { createId } from "~/shared/id";
import { canonicalInstant } from "~/shared/time";

function candidateAnimeIds(draft: CandidateDraft): string[] {
  return [...new Set([draft.animeId, ...(draft.animeIds ?? [])].filter((id): id is string => Boolean(id)))];
}

function candidateAnimeQueries(db: D1Database, candidateId: string, draft: CandidateDraft) {
  const orm = database(db);
  return candidateAnimeIds(draft).map((animeId) => orm.insert(candidateAnimeTable)
    .values({ candidateId, animeId })
    .onConflictDoNothing());
}

async function existingCandidateId(
  db: D1Database,
  draft: CandidateDraft,
  fingerprint: string,
): Promise<string | null> {
  const field = draft.originKey ? feedCandidatesTable.originKey : feedCandidatesTable.fingerprint;
  const row = await database(db).select({ id: feedCandidatesTable.id }).from(feedCandidatesTable)
    .where(eq(field, draft.originKey ?? fingerprint)).get();
  return row?.id ?? null;
}

function evidenceQuery(db: D1Database, candidateId: string, draft: CandidateDraft) {
  if (!draft.observationId && !draft.claimId) return null;
  return database(db).insert(candidateEvidenceTable).values({
    id: createId("evidence"),
    candidateId,
    observationId: draft.observationId ?? null,
    claimId: draft.claimId ?? null,
    relation: "supports",
  }).onConflictDoNothing();
}

async function mediaWrite(db: D1Database, draft: CandidateDraft) {
  if (!draft.media) return { id: null, query: null };
  const orm = database(db);
  const existing = await orm.select({ id: mediaItemsTable.id }).from(mediaItemsTable)
    .where(eq(mediaItemsTable.originalUrl, draft.media.originalUrl)).get();
  if (existing) return { id: existing.id, query: null };
  const id = createId("media");
  return {
    id,
    query: orm.insert(mediaItemsTable).values({
      id,
      animeId: draft.animeId ?? null,
      personId: draft.personId ?? null,
      characterId: draft.characterId ?? null,
      contentClass: draft.media.contentClass,
      title: draft.media.title,
      creatorName: draft.media.creatorName,
      creatorUrl: draft.media.creatorUrl ?? null,
      originalUrl: draft.media.originalUrl,
      previewUrl: draft.media.previewUrl ?? null,
      presentationMode: draft.media.presentationMode ?? "link_only",
      safetyRating: draft.media.safetyRating ?? draft.safetyRating ?? "unknown",
      spoilerLevel: draft.media.spoilerLevel ?? draft.spoilerLevel ?? "none",
      rightsNote: draft.media.rightsNote ?? null,
      publishedAt: draft.publishedAt,
    }),
  };
}

export async function createCandidate(db: D1Database, draft: CandidateDraft): Promise<string> {
  draft = { ...draft, publishedAt: canonicalInstant(draft.publishedAt) };
  const fingerprint = await stableFingerprint(draft.originKey ?? `${draft.url}|${draft.title}|${draft.publishedAt}`);
  const orm = database(db);
  const existingId = await existingCandidateId(db, draft, fingerprint);
  if (existingId) {
    const queries: BatchItem<"sqlite">[] = candidateAnimeQueries(db, existingId, draft);
    if (draft.observationId) {
      queries.push(orm.update(feedCandidatesTable).set({ observationId: draft.observationId })
        .where(eq(feedCandidatesTable.id, existingId)));
    }
    if (draft.contentClass === "community_thread") {
      queries.push(orm.update(feedCandidatesTable).set({
        observationId: sql`COALESCE(${draft.observationId ?? null}, ${feedCandidatesTable.observationId})`,
        platformObjectId: sql`COALESCE(${draft.platformObjectId ?? null}, ${feedCandidatesTable.platformObjectId})`,
        title: draft.title,
        summary: draft.summary,
        sourceName: draft.sourceName,
        importance: draft.importance ?? 2,
        publishedAt: draft.publishedAt,
        presentationMode: draft.presentationMode ?? "link_only",
        safetyRating: draft.safetyRating ?? "unknown",
        spoilerLevel: draft.spoilerLevel ?? "none",
        confidence: draft.confidence ?? 0,
        extractorVersion: draft.extractorVersion ?? "manual@1",
        policyVersion: draft.policyVersion ?? "publish-policy@1",
      }).where(and(
        eq(feedCandidatesTable.id, existingId),
        eq(feedCandidatesTable.contentClass, "community_thread"),
        ne(feedCandidatesTable.status, "published"),
      )));
    }
    const evidence = evidenceQuery(db, existingId, draft);
    if (evidence) queries.push(evidence);
    if (queries.length > 0) await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    return existingId;
  }

  const id = createId("candidate");
  const media = await mediaWrite(db, draft);
  const queries: BatchItem<"sqlite">[] = [];
  if (media.query) queries.push(media.query);
  queries.push(orm.insert(feedCandidatesTable).values({
    id,
    observationId: draft.observationId ?? null,
    animeId: draft.animeId ?? draft.animeIds?.[0] ?? null,
    personId: draft.personId ?? null,
    characterId: draft.characterId ?? null,
    eventId: null,
    mediaId: media.id,
    accountId: draft.accountId ?? null,
    platformObjectId: draft.platformObjectId ?? null,
    originKey: draft.originKey ?? null,
    contentClass: draft.contentClass,
    sourceIdentity: draft.sourceIdentity,
    title: draft.title,
    summary: draft.summary,
    url: draft.url,
    sourceName: draft.sourceName,
    sourceAccount: draft.sourceAccount ?? null,
    importance: draft.importance ?? 2,
    publishedAt: draft.publishedAt,
    presentationMode: draft.presentationMode ?? "link_only",
    safetyRating: draft.safetyRating ?? "unknown",
    spoilerLevel: draft.spoilerLevel ?? "none",
    confidence: draft.confidence ?? 0,
    status: "pending",
    discoveredBy: draft.discoveredBy ?? "manual",
    extractorVersion: draft.extractorVersion ?? "manual@1",
    policyVersion: draft.policyVersion ?? "publish-policy@1",
    fingerprint,
    reviewedAt: null,
  }));
  const evidence = evidenceQuery(db, id, draft);
  if (evidence) queries.push(evidence);
  queries.push(...candidateAnimeQueries(db, id, draft));
  await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return id;
}
