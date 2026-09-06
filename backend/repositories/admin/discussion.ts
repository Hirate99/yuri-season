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
import type { AdminPrincipal } from "~/infrastructure/auth";
import type { ResourceAudit, ResourceChangeAudit } from "./resource-write";
import { resourceAuditSnapshot } from "./resource-audit";

function linkedAnimeIds(animeId: string, value: DiscussionWrite): string[] {
  const ids = [...new Set([animeId, ...value.animeIds])];
  if (ids.length > 100) throw new HttpError(400, "讨论串最多关联 100 部作品（含当前作品）。");
  return ids;
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

export async function createDiscussion(db: D1Database, animeId: string, value: DiscussionWrite, audit: ResourceAudit): Promise<string> {
  const animeIds = linkedAnimeIds(animeId, value);
  await assertAnimeLinks(db, animeIds);
  const orm = database(db);
  const existing = await orm.select({ id: discussionsTable.id }).from(discussionsTable)
    .where(eq(discussionsTable.url, value.url)).get();
  if (existing) {
    const links: BatchItem<"sqlite">[] = linkQueries(db, existing.id, animeIds);
    links.push(audit(existing.id));
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
  queries.push(audit(id));
  await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return id;
}

export async function updateDiscussion(db: D1Database, animeId: string, id: string, value: DiscussionWrite, audit: ResourceChangeAudit): Promise<void> {
  const before = await resourceAuditSnapshot(db, animeId, "discussion", id);
  const orm = database(db);

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
      // Preserve existing links while staying below D1's 100-parameter limit.
      notInArray(discussionAnimeTable.animeId, sql`(SELECT value FROM json_each(${JSON.stringify(animeIds)}))`),
    )),
    ...linkQueries(db, id, animeIds),
  ];
  queries.push(audit(before));
  await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

export async function unlinkDiscussionFromAnime(
  db: D1Database,
  animeId: string,
  id: string,
  audit: ResourceChangeAudit,
): Promise<D1Result> {
  const before = await resourceAuditSnapshot(db, animeId, "discussion", id);
  const orm = database(db);
  const remaining = await orm.select({ animeId: discussionAnimeTable.animeId }).from(discussionAnimeTable)
    .where(and(
      eq(discussionAnimeTable.discussionId, id),
      notInArray(discussionAnimeTable.animeId, [animeId]),
    ))
    .orderBy(discussionAnimeTable.animeId)
    .limit(1)
    .get();
  if (!remaining) throw new HttpError(409, "这是讨论串的最后一个作品关联，请使用彻底删除。");

  const [result] = await orm.batch([
    orm.delete(discussionAnimeTable).where(and(
      eq(discussionAnimeTable.discussionId, id),
      eq(discussionAnimeTable.animeId, animeId),
    )),
    orm.update(discussionsTable).set({
      animeId: remaining.animeId,
    }).where(and(eq(discussionsTable.id, id), eq(discussionsTable.animeId, animeId))),
    audit(before),
  ]);
  return result;
}

export async function deleteDiscussionEverywhere(
  db: D1Database,
  id: string,
  reason: string,
  principal?: AdminPrincipal,
): Promise<void> {
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
      principal,
      reason: normalizedReason,
      title: discussion.title,
      url: discussion.url,
    }),
  ]);
}
