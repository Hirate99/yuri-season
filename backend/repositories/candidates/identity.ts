import type { AdminPrincipal } from "~/infrastructure/auth";
import { and, eq, isNull, ne, or } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { feedCandidatesTable, feedItemsTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { auditInsert } from "../audit";

export async function backfillCandidatePlatformIdentity(
  db: D1Database,
  id: string,
  expectedUrl: string,
  platformObjectId: string,
  principal?: AdminPrincipal,
): Promise<void> {
  const orm = database(db);
  const current = await orm
    .select({
      animeId: feedCandidatesTable.animeId,
      url: feedCandidatesTable.url,
      platformObjectId: feedCandidatesTable.platformObjectId,
      feedItemId: feedItemsTable.id,
      feedPlatformObjectId: feedItemsTable.platformObjectId,
      withdrawnAt: feedItemsTable.withdrawnAt,
    })
    .from(feedCandidatesTable)
    .leftJoin(feedItemsTable, eq(feedItemsTable.candidateId, feedCandidatesTable.id))
    .where(eq(feedCandidatesTable.id, id))
    .get();

  if (!current) throw new HttpError(404, "没有找到这条候选。");
  if (current.url !== expectedUrl) throw new HttpError(409, "候选 URL 已变化，拒绝补写身份。");
  if (!current.animeId) throw new HttpError(409, "候选没有作品关系，不能补写平台身份。");
  if (!current.feedItemId || current.withdrawnAt) {
    throw new HttpError(409, "只有仍在公开的历史候选可以补写平台身份。");
  }
  if (current.platformObjectId && current.platformObjectId !== platformObjectId) {
    throw new HttpError(409, "候选已有不同的平台对象 ID。");
  }
  if (
    current.platformObjectId === platformObjectId &&
    current.feedPlatformObjectId === platformObjectId
  ) {
    return;
  }

  const conflict = await orm
    .select({ id: feedCandidatesTable.id })
    .from(feedCandidatesTable)
    .where(
      and(
        ne(feedCandidatesTable.id, id),
        eq(feedCandidatesTable.animeId, current.animeId),
        eq(feedCandidatesTable.platformObjectId, platformObjectId),
      ),
    )
    .get();
  if (conflict) throw new HttpError(409, "同一作品已有使用该平台对象 ID 的候选。");

  await orm.batch([
    orm
      .update(feedCandidatesTable)
      .set({ platformObjectId })
      .where(
        and(
          eq(feedCandidatesTable.id, id),
          eq(feedCandidatesTable.url, expectedUrl),
          or(
            isNull(feedCandidatesTable.platformObjectId),
            eq(feedCandidatesTable.platformObjectId, platformObjectId),
          ),
        ),
      ),
    orm
      .update(feedItemsTable)
      .set({ platformObjectId })
      .where(and(eq(feedItemsTable.candidateId, id), isNull(feedItemsTable.withdrawnAt))),
    auditInsert(db, "admin", "backfill_candidate_platform_identity", "feed_candidate", id, {
      principal,
      expectedUrl,
      before: { platformObjectId: current.platformObjectId },
      after: { platformObjectId },
    }),
  ]);
}
