import type { ReviewDecision } from "@/domain";
import type { BatchItem } from "drizzle-orm/batch";
import { eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import {
  candidateAnimeTable,
  correctionsTable,
  discussionAnimeTable,
  discussionsTable,
  feedCandidatesTable,
  feedItemsTable,
  publicationDocumentsTable,
  researchSourcesTable,
  reviewDecisionsTable,
  sourceObservationsTable,
} from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

import { auditInsert } from "../audit";
import type { AdminPrincipal } from "~/infrastructure/auth";

export type ReviewMetadata = {
  reviewerType: "llm" | "policy" | "admin" | "local_skill";
  confidence?: number;
  model?: string;
  promptVersion?: string;
  reasons?: string[];
  output?: unknown;
  principal?: AdminPrincipal;
};

type CandidateDecisionRow = NonNullable<Awaited<ReturnType<typeof candidateForDecision>>>;

function candidateForDecision(db: D1Database, candidateId: string) {
  return database(db)
    .select({
      id: feedCandidatesTable.id,
      animeId: feedCandidatesTable.animeId,
      contentClass: feedCandidatesTable.contentClass,
      title: feedCandidatesTable.title,
      url: feedCandidatesTable.url,
      sourceName: feedCandidatesTable.sourceName,
      publishedAt: feedCandidatesTable.publishedAt,
      feedItemId: feedItemsTable.id,
      withdrawnAt: feedItemsTable.withdrawnAt,
    })
    .from(feedCandidatesTable)
    .leftJoin(feedItemsTable, eq(feedItemsTable.candidateId, feedCandidatesTable.id))
    .where(eq(feedCandidatesTable.id, candidateId))
    .get();
}

function validateWithdrawal(candidate: CandidateDecisionRow, metadata: ReviewMetadata): void {
  if (!candidate.feedItemId) throw new HttpError(409, "这条动态尚未发布。");
  if (candidate.withdrawnAt) throw new HttpError(409, "这条动态已经撤回。");
  if (!metadata.reasons?.[0]?.trim()) throw new HttpError(400, "请填写撤回原因。");
}

function validateDecisionTransition(
  candidate: CandidateDecisionRow,
  decision: ReviewDecision,
): void {
  if (!candidate.feedItemId) return;

  if (candidate.withdrawnAt) {
    if (decision === "withdraw") return;

    throw new HttpError(409, "这条动态已经撤回，不能重新审核或发布。");
  }

  if (decision === "hold" || decision === "reject") {
    throw new HttpError(409, "已发布动态不能改为暂存或拒绝，请使用撤回。");
  }
}

function reviewQuery(
  db: D1Database,
  candidateId: string,
  decision: ReviewDecision,
  metadata: ReviewMetadata,
) {
  return database(db)
    .insert(reviewDecisionsTable)
    .values({
      id: createId("review"),
      candidateId,
      reviewerType: metadata.reviewerType,
      decision,
      confidence: metadata.confidence ?? null,
      model: metadata.model ?? null,
      promptVersion: metadata.promptVersion ?? null,
      reasonsJson: JSON.stringify(metadata.reasons ?? []),
      outputJson: JSON.stringify(metadata.output ?? {}),
    });
}

function publicationQueries(
  db: D1Database,
  candidate: CandidateDecisionRow,
  metadata: ReviewMetadata,
): BatchItem<"sqlite">[] {
  const orm = database(db);
  const queries: BatchItem<"sqlite">[] = [];

  if (candidate.contentClass === "community_thread" && candidate.animeId) {
    queries.push(
      orm
        .insert(discussionsTable)
        .values({
          id: createId("discussion"),
          animeId: candidate.animeId,
          platform: candidate.sourceName,
          title: candidate.title,
          url: candidate.url,
          note: null,
          isActive: true,
          lastActivityAt: candidate.publishedAt,
          lastCheckedAt: sql`CURRENT_TIMESTAMP`,
        })
        .onConflictDoUpdate({
          target: discussionsTable.url,
          set: {
            platform: candidate.sourceName,
            title: candidate.title,
            isActive: true,
            lastActivityAt: candidate.publishedAt,
            lastCheckedAt: sql`CURRENT_TIMESTAMP`,
          },
        }),
    );
    queries.push(
      orm
        .insert(discussionAnimeTable)
        .select(
          orm
            .select({
              discussionId: discussionsTable.id,
              animeId: candidateAnimeTable.animeId,
              createdAt: sql<string>`CURRENT_TIMESTAMP`.as("created_at"),
            })
            .from(discussionsTable)
            .innerJoin(candidateAnimeTable, eq(candidateAnimeTable.candidateId, candidate.id))
            .where(eq(discussionsTable.url, candidate.url)),
        )
        .onConflictDoNothing(),
    );
  }

  const capturedText = sql<string | null>`NULLIF(${sourceObservationsTable.publicText}, '')`;

  const capturedTranslation = sql<
    string | null
  >`NULLIF(${sourceObservationsTable.publicTranslation}, '')`;

  const capturedTextMode = sql<
    string | null
  >`NULLIF(json_extract(${sourceObservationsTable.metadataJson}, '$.publicTextMode'), '')`;

  queries.push(
    orm
      .insert(feedItemsTable)
      .select(
        orm
          .select({
            id: sql<string>`${createId("feed")}`.as("id"),
            candidateId: feedCandidatesTable.id,
            animeId: feedCandidatesTable.animeId,
            personId: feedCandidatesTable.personId,
            characterId: feedCandidatesTable.characterId,
            eventId: feedCandidatesTable.eventId,
            mediaId: feedCandidatesTable.mediaId,
            accountId: feedCandidatesTable.accountId,
            discussionId: sql<
              string | null
            >`CASE WHEN ${feedCandidatesTable.contentClass} = 'community_thread'
        THEN ${discussionsTable.id} ELSE NULL END`.as("discussion_id"),
            platformObjectId: feedCandidatesTable.platformObjectId,
            originKey: feedCandidatesTable.originKey,
            contentClass: feedCandidatesTable.contentClass,
            sourceIdentity: feedCandidatesTable.sourceIdentity,
            title: feedCandidatesTable.title,
            summary: feedCandidatesTable.summary,
            url: feedCandidatesTable.url,
            sourceName: feedCandidatesTable.sourceName,
            sourceAccount: feedCandidatesTable.sourceAccount,
            importance: feedCandidatesTable.importance,
            publishedAt: feedCandidatesTable.publishedAt,
            safetyRating: feedCandidatesTable.safetyRating,
            spoilerLevel: feedCandidatesTable.spoilerLevel,
            autoPublished: sql<boolean>`${metadata.reviewerType === "admin" ? 0 : 1}`.as(
              "auto_published",
            ),
            isPinned: sql<boolean>`0`.as("is_pinned"),
            withdrawnAt: sql<string | null>`NULL`.as("withdrawn_at"),
            createdAt: sql<string>`CURRENT_TIMESTAMP`.as("created_at"),
          })
          .from(feedCandidatesTable)
          .leftJoin(discussionsTable, eq(discussionsTable.url, feedCandidatesTable.url))
          .where(eq(feedCandidatesTable.id, candidate.id)),
      )
      .onConflictDoNothing(),
  );
  queries.push(
    orm
      .insert(publicationDocumentsTable)
      .select(
        orm
          .select({
            feedItemId: feedItemsTable.id,
            observationId: sourceObservationsTable.id,
            sourceId: sourceObservationsTable.sourceId,
            sourceTitle: sourceObservationsTable.title,
            authorName: sourceObservationsTable.authorName,
            sourceLanguage: sourceObservationsTable.originalLanguage,
            publicText: sql<string | null>`CASE
        WHEN ${feedItemsTable.contentClass} IN ('fanwork', 'community_thread') THEN NULL
        WHEN ${capturedTextMode} = 'excerpt'
          THEN SUBSTR(${capturedText}, 1, MIN(${researchSourcesTable.maxPublicCharacters}, 800))
        WHEN ${researchSourcesTable.publicTextMode} IN ('full', 'full_with_translation')
          THEN SUBSTR(${capturedText}, 1, ${researchSourcesTable.maxPublicCharacters})
        WHEN ${researchSourcesTable.publicTextMode} = 'excerpt'
          THEN SUBSTR(${capturedText}, 1, MIN(${researchSourcesTable.maxPublicCharacters}, 800))
        ELSE NULL
      END`.as("public_text"),
            publicTranslation: sql<string | null>`CASE
        WHEN ${feedItemsTable.contentClass} IN ('fanwork', 'community_thread') THEN NULL
        WHEN ${capturedText} IS NULL THEN NULL
        WHEN ${researchSourcesTable.publicTextMode} = 'full_with_translation'
          THEN SUBSTR(${capturedTranslation}, 1, ${researchSourcesTable.maxPublicCharacters})
        ELSE NULL
      END`.as("public_translation"),
            textMode: sql<
              "full" | "full_with_translation" | "excerpt" | "summary_only" | "link_only"
            >`CASE
        WHEN ${feedItemsTable.contentClass} IN ('fanwork', 'community_thread') THEN 'summary_only'
        WHEN ${sourceObservationsTable.id} IS NULL THEN 'summary_only'
        WHEN ${researchSourcesTable.publicTextMode} = 'link_only' THEN 'link_only'
        WHEN ${capturedText} IS NULL THEN 'summary_only'
        WHEN ${capturedTextMode} = 'excerpt' THEN 'excerpt'
        WHEN ${researchSourcesTable.publicTextMode} = 'full_with_translation' AND ${capturedTranslation} IS NULL THEN 'full'
        ELSE COALESCE(${researchSourcesTable.publicTextMode}, 'summary_only')
      END`.as("text_mode"),
            sourceContentHash: sourceObservationsTable.contentHash,
            sourceStatus: sql<"active">`'active'`.as("source_status"),
            capturedAt:
              sql<string>`COALESCE(${sourceObservationsTable.capturedAt}, ${feedItemsTable.createdAt})`.as(
                "captured_at",
              ),
            lastVerifiedAt: sourceObservationsTable.capturedAt,
          })
          .from(feedItemsTable)
          .leftJoin(feedCandidatesTable, eq(feedCandidatesTable.id, feedItemsTable.candidateId))
          .leftJoin(
            sourceObservationsTable,
            eq(sourceObservationsTable.id, feedCandidatesTable.observationId),
          )
          .leftJoin(
            researchSourcesTable,
            eq(researchSourcesTable.id, sourceObservationsTable.sourceId),
          )
          .where(eq(feedItemsTable.candidateId, candidate.id)),
      )
      .onConflictDoUpdate({
        target: publicationDocumentsTable.feedItemId,
        set: {
          observationId: sql`excluded.observation_id`,
          sourceId: sql`excluded.source_id`,
          sourceTitle: sql`excluded.source_title`,
          authorName: sql`excluded.author_name`,
          sourceLanguage: sql`excluded.source_language`,
          publicText: sql`excluded.public_text`,
          publicTranslation: sql`excluded.public_translation`,
          textMode: sql`excluded.text_mode`,
          sourceContentHash: sql`excluded.source_content_hash`,
          sourceStatus: "active",
          capturedAt: sql`excluded.captured_at`,
          lastVerifiedAt: sql`excluded.last_verified_at`,
        },
      }),
  );

  return queries;
}

function withdrawalQueries(
  db: D1Database,
  feedItemId: string,
  actorType: "system" | "llm" | "admin" | "local_skill",
  reason: string,
) {
  const orm = database(db);

  return [
    orm.insert(correctionsTable).values({
      id: createId("correction"),
      feedItemId,
      correctionType: "withdraw",
      reason,
      replacementFeedItemId: null,
      actorType,
      createdAt: sql`CURRENT_TIMESTAMP`,
    }),
    orm
      .update(feedItemsTable)
      .set({ withdrawnAt: sql`CURRENT_TIMESTAMP` })
      .where(sql`${feedItemsTable.id} = ${feedItemId} AND ${feedItemsTable.withdrawnAt} IS NULL`),
    orm
      .update(publicationDocumentsTable)
      .set({
        textMode: "withdrawn",
        sourceStatus: "withdrawn",
        publicText: null,
        publicTranslation: null,
      })
      .where(eq(publicationDocumentsTable.feedItemId, feedItemId)),
  ] as const;
}

export async function applyCandidateDecision(
  db: D1Database,
  candidateId: string,
  decision: ReviewDecision,
  metadata: ReviewMetadata,
): Promise<void> {
  const candidate = await candidateForDecision(db, candidateId);
  if (!candidate) throw new HttpError(404, "没有找到这条候选。");

  validateDecisionTransition(candidate, decision);
  if (decision === "withdraw") validateWithdrawal(candidate, metadata);

  const status =
    decision === "publish" || decision === "withdraw"
      ? "published"
      : decision === "hold"
        ? "held"
        : "rejected";

  const actorType = metadata.reviewerType === "policy" ? "system" : metadata.reviewerType;
  const orm = database(db);

  const queries: BatchItem<"sqlite">[] = [
    orm
      .update(feedCandidatesTable)
      .set({ status, reviewedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(feedCandidatesTable.id, candidateId)),
    reviewQuery(db, candidateId, decision, metadata),
  ];
  if (decision === "publish") queries.push(...publicationQueries(db, candidate, metadata));

  if (decision === "withdraw") {
    queries.push(
      ...withdrawalQueries(db, candidate.feedItemId!, actorType, metadata.reasons![0].trim()),
    );
  }

  queries.push(
    auditInsert(db, actorType, "review_candidate", "feed_candidate", candidateId, {
      principal: metadata.principal,
      decision,
      reasons: metadata.reasons ?? [],
      feedItemId: candidate.feedItemId,
    }),
  );
  await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}
