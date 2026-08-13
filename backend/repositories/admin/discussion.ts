import type { DiscussionWrite } from "@/domain";
import type { BatchItem } from "drizzle-orm/batch";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import {
  animeTable,
  correctionsTable,
  discussionAnimeTable,
  discussionsTable,
  feedItemsTable,
} from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

import { auditInsert } from "../audit";

function linkedAnimeIds(animeId: string, value: DiscussionWrite): string[] {
  return [...new Set([animeId, ...(value.animeIds ?? [])])];
}

async function assertAnimeLinks(db: D1Database, animeIds: string[]): Promise<void> {
  const row = await database(db).select({ count: sql<number>`COUNT(*)` }).from(animeTable)
    .where(inArray(animeTable.id, animeIds)).get();
  if (row?.count !== animeIds.length) throw new HttpError(400, "讨论串包含不存在的作品。");
}

function linkQueries(db: D1Database, discussionId: string, animeIds: string[]) {
  const orm = database(db);
  return animeIds.map((animeId) => orm.insert(discussionAnimeTable)
    .values({ discussionId, animeId })
    .onConflictDoNothing());
}

export async function createDiscussion(db: D1Database, animeId: string, value: DiscussionWrite): Promise<string> {
  const animeIds = linkedAnimeIds(animeId, value);
  await assertAnimeLinks(db, animeIds);
  const orm = database(db);
  const existing = await orm.select({ id: discussionsTable.id }).from(discussionsTable)
    .where(eq(discussionsTable.url, value.url)).get();
  if (existing) {
    const links = linkQueries(db, existing.id, animeIds);
    await orm.batch(links as unknown as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
    return existing.id;
  }

  const id = createId("discussion");
  const queries: BatchItem<"sqlite">[] = [
    orm.insert(discussionsTable).values({
      id,
      animeId,
      platform: value.platform,
      title: value.title,
      url: value.url,
      note: value.note,
      isActive: value.isActive,
      lastActivityAt: value.lastActivityAt,
      lastCheckedAt: sql`CURRENT_TIMESTAMP`,
    }),
    ...linkQueries(db, id, animeIds),
  ];
  await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return id;
}

export async function updateDiscussion(db: D1Database, animeId: string, id: string, value: DiscussionWrite): Promise<void> {
  const orm = database(db);
  const linked = await orm.select({ discussionId: discussionAnimeTable.discussionId })
    .from(discussionAnimeTable).where(and(
      eq(discussionAnimeTable.discussionId, id),
      eq(discussionAnimeTable.animeId, animeId),
    )).get();
  if (!linked) throw new HttpError(404, "没有找到讨论串。");

  const animeIds = linkedAnimeIds(animeId, value);
  await assertAnimeLinks(db, animeIds);
  const queries: BatchItem<"sqlite">[] = [
    orm.update(discussionsTable).set({
      animeId,
      platform: value.platform,
      title: value.title,
      url: value.url,
      note: value.note,
      isActive: value.isActive,
      lastActivityAt: value.lastActivityAt,
      lastCheckedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(discussionsTable.id, id)),
    orm.delete(discussionAnimeTable).where(and(
      eq(discussionAnimeTable.discussionId, id),
      notInArray(discussionAnimeTable.animeId, animeIds),
    )),
    ...linkQueries(db, id, animeIds),
  ];
  await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

export async function unlinkDiscussionFromAnime(db: D1Database, animeId: string, id: string): Promise<D1Result> {
  const orm = database(db);
  const linked = await orm.select({ discussionId: discussionAnimeTable.discussionId })
    .from(discussionAnimeTable).where(and(
      eq(discussionAnimeTable.discussionId, id),
      eq(discussionAnimeTable.animeId, animeId),
    )).get();
  if (!linked) throw new HttpError(404, "没有找到当前作品的讨论关联。");
  const linkCount = await orm.select({ count: sql<number>`COUNT(*)` }).from(discussionAnimeTable)
    .where(eq(discussionAnimeTable.discussionId, id)).get();
  if ((linkCount?.count ?? 0) <= 1) throw new HttpError(409, "这是讨论串的最后一个作品关联，请使用彻底删除。");
  const remaining = await orm.select({ animeId: discussionAnimeTable.animeId }).from(discussionAnimeTable)
    .where(and(
      eq(discussionAnimeTable.discussionId, id),
      notInArray(discussionAnimeTable.animeId, [animeId]),
    ))
    .orderBy(discussionAnimeTable.animeId)
    .limit(1)
    .get();
  if (!remaining) throw new HttpError(409, "讨论串没有可保留的作品关联。");

  const [result] = await orm.batch([
    orm.delete(discussionAnimeTable).where(and(
      eq(discussionAnimeTable.discussionId, id),
      eq(discussionAnimeTable.animeId, animeId),
    )),
    orm.update(discussionsTable).set({
      animeId: remaining.animeId,
    }).where(and(eq(discussionsTable.id, id), eq(discussionsTable.animeId, animeId))),
  ]);
  return result;
}

export async function deleteDiscussionEverywhere(db: D1Database, id: string, reason: string): Promise<void> {
  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new HttpError(400, "彻底删除需要填写原因。");
  if (normalizedReason.length > 300) throw new HttpError(400, "彻底删除原因不能超过 300 字。");
  const orm = database(db);
  const discussion = await orm.select({ id: discussionsTable.id, title: discussionsTable.title, url: discussionsTable.url })
    .from(discussionsTable).where(eq(discussionsTable.id, id)).get();
  if (!discussion) throw new HttpError(404, "没有找到讨论串。");

  await orm.batch([
    orm.insert(correctionsTable).select(
      orm.select({
        id: sql<string>`'correction-discussion-delete-' || ${feedItemsTable.id}`.as("id"),
        feedItemId: feedItemsTable.id,
        correctionType: sql<"withdraw">`'withdraw'`.as("correction_type"),
        reason: sql<string>`${normalizedReason}`.as("reason"),
        replacementFeedItemId: sql<string | null>`NULL`.as("replacement_feed_item_id"),
        actorType: sql<string>`'admin'`.as("actor_type"),
        createdAt: sql<string>`CURRENT_TIMESTAMP`.as("created_at"),
      }).from(feedItemsTable).where(and(
        eq(feedItemsTable.discussionId, id),
        isNull(feedItemsTable.withdrawnAt),
      )),
    ),
    orm.update(feedItemsTable).set({ withdrawnAt: sql`CURRENT_TIMESTAMP` }).where(and(
      eq(feedItemsTable.discussionId, id),
      isNull(feedItemsTable.withdrawnAt),
    )),
    orm.update(feedItemsTable).set({ discussionId: null }).where(eq(feedItemsTable.discussionId, id)),
    orm.delete(discussionsTable).where(eq(discussionsTable.id, id)),
    auditInsert(db, "admin", "delete_discussion", "discussion", id, {
      reason: normalizedReason,
      title: discussion.title,
      url: discussion.url,
    }),
  ]);
}
