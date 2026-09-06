import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { communityPageInput, moderationInput, postInput, threadInput } from "@/domain/community";
import { database } from "~/infrastructure/db/client";
import { animeTable as anime, authUsers as users, communityPosts as posts, communityLikes as likes, communityReports as reports, communityThreads as threads } from "~/infrastructure/db/schema";
import type { AdminPrincipal } from "~/infrastructure/auth";
import { HttpError } from "~/shared/http-error";
import { auditInsert } from "./audit";

const PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 10;
const cursorSchema = z.tuple([z.number().int().min(0).max(1), z.number().int().nonnegative(), z.string().max(120)]);
function cursor(value?: string) {
  if (!value) return undefined;
  try { return cursorSchema.parse(JSON.parse(atob(value))); }
  catch { throw new HttpError(400, "分页位置无效，请刷新后重试。"); }
}
const publicPost = (userId?: string) => ({
  id: posts.id, authorId: posts.authorId, name: users.name, replyToId: posts.replyToId,
  floor: posts.floor,
  likes: sql<number>`(select count(*) from community_likes l where l.post_id = ${posts.id})`,
  liked: sql<boolean>`exists (select 1 from community_likes l where l.post_id = ${posts.id} and l.user_id = ${userId ?? ""})`.mapWith(Boolean),
  parentPostId: posts.parentPostId,
  commentNumber: sql<number | null>`case when ${posts.parentPostId} is not null then (select count(*) from community_posts p where p.parent_post_id = ${posts.parentPostId} and (p.created_at < ${posts.createdAt} or (p.created_at = ${posts.createdAt} and p.id <= ${posts.id}))) end`,
  comments: sql<number>`(select count(*) from community_posts p where p.parent_post_id = ${posts.id} and p.hidden = 0)`,
  replyToFloor: sql<number | null>`(select p.floor from community_posts p where p.id = ${posts.replyToId})`,
  replyToName: sql<string | null>`(select u.name from community_posts p join auth_users u on u.id = p.author_id where p.id = ${posts.replyToId})`,
  replyToExcerpt: sql<string | null>`(select case when p.hidden then null else substr(p.body, 1, 200) end from community_posts p where p.id = ${posts.replyToId})`,
  body: sql<string>`case when ${posts.hidden} then '' else ${posts.body} end`,
  hidden: posts.hidden, createdAt: posts.createdAt, updatedAt: posts.updatedAt,
});
async function withCommentPreviews<T extends { id: string; comments: number; hidden: boolean }>(binding: D1Database, items: T[], userId?: string) {
  const db = database(binding);
  const ids = items.filter((post) => !post.hidden && post.comments > 0).map((post) => post.id);
  const ranked = db.select({ id: posts.id, rank: sql<number>`row_number() over (partition by ${posts.parentPostId} order by ${posts.createdAt}, ${posts.id})`.as("rank") })
    .from(posts).where(and(inArray(posts.parentPostId, ids), eq(posts.hidden, false))).as("preview_rank");
  const previews = ids.length ? await db.select({ ...publicPost(userId), body: sql<string>`substr(${posts.body}, 1, 240)` }).from(posts)
    .innerJoin(ranked, eq(ranked.id, posts.id)).innerJoin(users, eq(users.id, posts.authorId))
    .where(lte(ranked.rank, 2)).orderBy(asc(posts.createdAt), asc(posts.id)) : [];
  return items.map((post) => ({ ...post, commentPreviews: previews.filter((comment) => comment.parentPostId === post.id) }));
}

const threadSummary = {
  id: threads.id, title: threads.title, episode: threads.episode, spoiler: threads.spoiler,
  pinned: threads.pinned, locked: threads.locked, createdAt: threads.createdAt, lastActivityAt: threads.lastActivityAt,
  authorId: threads.authorId, name: users.name,
  replies: sql<number>`(select count(*) from community_posts p where p.thread_id = ${threads.id} and p.id != ${threads.id} and p.hidden = 0)`,
};

export async function listThreads(binding: D1Database, slug: string, input: z.infer<typeof communityPageInput>) {
  const db = database(binding);
  const [work] = await db.select({ id: anime.id, slug: anime.slug, title: anime.titleZh }).from(anime).where(eq(anime.slug, slug));
  if (!work) throw new HttpError(404, "没有找到这部动画。");
  const position = cursor(input.cursor);
  const order = input.order === "new" ? threads.createdAt : threads.lastActivityAt;
  const rows = await db.select(threadSummary).from(threads).innerJoin(users, eq(users.id, threads.authorId))
    .where(and(eq(threads.animeId, work.id), eq(threads.hidden, false),
      input.episode ? eq(threads.episode, input.episode) : undefined,
      position ? or(lt(threads.pinned, Boolean(position[0])), and(eq(threads.pinned, Boolean(position[0])), or(lt(order, position[1]), and(eq(order, position[1]), lt(threads.id, position[2]))))) : undefined))
    .orderBy(desc(threads.pinned), desc(order), desc(threads.id)).limit(PAGE_SIZE + 1);
  const items = rows.slice(0, PAGE_SIZE), last = items.at(-1);
  return { anime: work, items, nextCursor: rows.length > PAGE_SIZE && last ? btoa(JSON.stringify([Number(last.pinned), input.order === "new" ? last.createdAt : last.lastActivityAt, last.id])) : null };
}

async function findThread(binding: D1Database, id: string) {
  const db = database(binding);
  const [thread] = await db.select({ ...threadSummary, anime: { id: anime.id, slug: anime.slug, title: anime.titleZh } })
    .from(threads).innerJoin(users, eq(users.id, threads.authorId)).innerJoin(anime, eq(anime.id, threads.animeId))
    .where(and(eq(threads.id, id), eq(threads.hidden, false)));
  if (!thread) throw new HttpError(404, "讨论不存在或已被隐藏。");
  return thread;
}
export async function getThread(binding: D1Database, id: string, userId?: string) {
  const thread = await findThread(binding, id);
  const db = database(binding);
  const [row] = await db.select(publicPost(userId)).from(posts).innerJoin(users, eq(users.id, posts.authorId)).where(eq(posts.id, id));
  const [post] = await withCommentPreviews(binding, [row], userId);
  return { ...thread, post };
}
export async function listReplies(binding: D1Database, id: string, after?: string, userId?: string) {
  await findThread(binding, id);
  const position = cursor(after);
  const rows = await database(binding).select(publicPost(userId)).from(posts).innerJoin(users, eq(users.id, posts.authorId))
    .where(and(eq(posts.threadId, id), ne(posts.id, id), isNull(posts.parentPostId), position ? gt(posts.floor, position[1]) : undefined))
    .orderBy(asc(posts.floor)).limit(PAGE_SIZE + 1);
  const items = rows.slice(0, PAGE_SIZE), last = items.at(-1);
  return { items: await withCommentPreviews(binding, items, userId), nextCursor: rows.length > PAGE_SIZE && last ? btoa(JSON.stringify([0, last.floor, last.id])) : null };
}

export async function listComments(binding: D1Database, id: string, after?: string, userId?: string) {
  const db = database(binding);
  const [parent] = await db.select({ threadId: posts.threadId }).from(posts).where(and(eq(posts.id, id), isNull(posts.parentPostId), eq(posts.hidden, false)));
  if (!parent) throw new HttpError(404, "楼层不存在或已隐藏。");
  await findThread(binding, parent.threadId);
  const position = cursor(after);
  const rows = await db.select(publicPost(userId)).from(posts).innerJoin(users, eq(users.id, posts.authorId))
    .where(and(eq(posts.parentPostId, id), position ? or(gt(posts.createdAt, position[1]), and(eq(posts.createdAt, position[1]), gt(posts.id, position[2]))) : undefined))
    .orderBy(asc(posts.createdAt), asc(posts.id)).limit(COMMENT_PAGE_SIZE + 1);
  const items = rows.slice(0, COMMENT_PAGE_SIZE), last = items.at(-1);
  return { items, nextCursor: rows.length > COMMENT_PAGE_SIZE && last ? btoa(JSON.stringify([0, last.createdAt, last.id])) : null };
}

export async function setLike(binding: D1Database, id: string, userId: string, liked: boolean) {
  const db = database(binding);
  const available = db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, id), eq(posts.hidden, false),
    sql`exists (select 1 from community_threads t where t.id = ${posts.threadId} and t.hidden = 0 and t.locked = 0)`,
    sql`(${posts.parentPostId} is null or exists (select 1 from community_posts p where p.id = ${posts.parentPostId} and p.hidden = 0))`,
    sql`exists (select 1 from auth_users u where u.id = ${userId} and u.banned = 0)`));
  const [allowed, , result] = await db.batch([
    available,
    liked
      ? db.insert(likes).select(db.select({ postId: posts.id, userId: sql<string>`${userId}`.as("user_id") }).from(posts).where(and(eq(posts.id, id), sql`exists ${available}`))).onConflictDoNothing()
      : db.delete(likes).where(and(eq(likes.postId, id), eq(likes.userId, userId), sql`exists ${available}`)),
    db.select({ likes: publicPost(userId).likes, liked: publicPost(userId).liked }).from(posts).where(eq(posts.id, id)),
  ]);
  if (!allowed.length) throw new HttpError(403, "当前内容无法点赞或取消点赞。");
  return result[0];
}

async function reservePost(binding: D1Database, userId: string) {
  const now = Date.now();
  const [user] = await database(binding).update(users).set({ lastPostedAt: now })
    .where(and(eq(users.id, userId), eq(users.banned, false), lt(users.lastPostedAt, now - 30_000))).returning({ id: users.id });
  if (!user) throw new HttpError(429, "操作太快，请 30 秒后再试。");
  return now;
}
export async function createThread(binding: D1Database, slug: string, userId: string, input: z.infer<typeof threadInput>) {
  const db = database(binding);
  const [work] = await db.select({ id: anime.id }).from(anime).where(eq(anime.slug, slug));
  if (!work) throw new HttpError(404, "没有找到这部动画。");
  const now = await reservePost(binding, userId), id = crypto.randomUUID();
  await db.batch([
    db.insert(threads).values({ id, animeId: work.id, authorId: userId, title: input.title, episode: input.episode, spoiler: input.spoiler, createdAt: now, lastActivityAt: now }),
    db.insert(posts).values({ id, threadId: id, authorId: userId, body: input.body, floor: 1, createdAt: now, updatedAt: now }),
  ]);
  return { id };
}
export async function reply(binding: D1Database, id: string, userId: string, input: z.infer<typeof postInput>, parentPostId?: string) {
  const thread = await findThread(binding, id);
  if (thread.locked) throw new HttpError(403, "这个讨论已锁定。");
  if (input.replyToId) {
    const [target] = await database(binding).select({ id: posts.id }).from(posts).where(and(eq(posts.id, input.replyToId), eq(posts.threadId, id), parentPostId ? eq(posts.parentPostId, parentPostId) : isNull(posts.parentPostId), eq(posts.hidden, false)));
    if (!target) throw new HttpError(400, parentPostId ? "只能回复当前楼层中尚未隐藏的评论。" : "引用的楼层不存在或已隐藏。");
  }
  const now = await reservePost(binding, userId), postId = crypto.randomUUID();
  // The insert checks moderation state again inside D1's atomic batch.
  const db = database(binding);
  const availablePost = (target: string | null | undefined, parent: string | null) => target ? sql`exists (select 1 from community_posts p where p.id = ${target} and p.thread_id = ${id} and p.parent_post_id is ${parent} and p.hidden = 0)` : undefined;
  const result = await db.batch([
    db.insert(posts).select(db.select({
      id: sql<string>`${postId}`.as("id"), threadId: threads.id, authorId: sql<string>`${userId}`.as("author_id"), body: sql<string>`${input.body}`.as("body"),
      floor: sql<number | null>`case when ${parentPostId ?? null} is null then (select coalesce(max(p.floor), 0) + 1 from community_posts p where p.thread_id = community_threads.id) end`.as("floor"),
      parentPostId: sql<string | null>`${parentPostId ?? null}`.as("parent_post_id"), replyToId: sql<string | null>`${input.replyToId ?? null}`.as("reply_to_id"), hidden: sql<boolean>`0`.as("hidden"), createdAt: sql<number>`${now}`.as("created_at"), updatedAt: sql<number>`${now}`.as("updated_at"),
    }).from(threads).where(and(eq(threads.id, id), eq(threads.locked, false), eq(threads.hidden, false),
      sql`exists (select 1 from auth_users where id = ${userId} and banned = 0)`, availablePost(input.replyToId, parentPostId ?? null), availablePost(parentPostId, null)))),
    db.update(threads).set({ lastActivityAt: now }).where(and(eq(threads.id, id), sql`exists (select 1 from community_posts where id = ${postId})`)),
  ]);
  if (!result[0].meta.changes) throw new HttpError(409, "讨论状态已变化，请刷新后重试。");
  return { id: postId };
}
export async function comment(binding: D1Database, parentId: string, userId: string, input: z.infer<typeof postInput>) {
  const [parent] = await database(binding).select({ threadId: posts.threadId }).from(posts).where(and(eq(posts.id, parentId), isNull(posts.parentPostId), eq(posts.hidden, false)));
  if (!parent) throw new HttpError(404, "楼层不存在或已隐藏。");
  return reply(binding, parent.threadId, userId, input, parentId);
}
export async function editPost(binding: D1Database, id: string, userId: string, body: string) {
  const now = await reservePost(binding, userId);
  const result = await database(binding).update(posts).set({ body, updatedAt: now }).where(and(eq(posts.id, id), eq(posts.authorId, userId), eq(posts.hidden, false),
    sql`exists (select 1 from community_threads t where t.id = ${posts.threadId} and t.locked = 0 and t.hidden = 0)`,
    sql`(${posts.parentPostId} is null or exists (select 1 from community_posts p where p.id = ${posts.parentPostId} and p.hidden = 0))`,
    sql`exists (select 1 from auth_users where id = ${userId} and banned = 0)`)).run();
  if (!result.meta.changes) throw new HttpError(403, "无法编辑这条内容：仅作者可编辑未被锁定或隐藏的讨论。");
  return { ok: true };
}
export async function reportPost(binding: D1Database, id: string, userId: string, reason: string) {
  const db = database(binding);
  const [post] = await db.select({ id: posts.id }).from(posts).innerJoin(threads, eq(threads.id, posts.threadId))
    .where(and(eq(posts.id, id), eq(posts.hidden, false), eq(threads.hidden, false)));
  if (!post) throw new HttpError(404, "内容不存在或已隐藏。");
  const now = await reservePost(binding, userId);
  await db.insert(reports).values({ id: crypto.randomUUID(), postId: id, reporterId: userId, reason, createdAt: now }).onConflictDoNothing();
  return { ok: true };
}
export async function myActivity(binding: D1Database, userId: string) {
  return database(binding).select({ id: posts.id, threadId: threads.id, title: threads.title, createdAt: posts.createdAt, hidden: posts.hidden, threadHidden: threads.hidden })
    .from(posts).innerJoin(threads, eq(threads.id, posts.threadId)).where(eq(posts.authorId, userId)).orderBy(desc(posts.createdAt), desc(posts.id)).limit(50);
}
export async function moderationQueue(binding: D1Database) {
  const db = database(binding);
  const [queue, recent, bannedUsers, hiddenPosts] = await Promise.all([
    db.select({ id: reports.id, reason: reports.reason, createdAt: reports.createdAt, postId: posts.id, body: posts.body, hidden: posts.hidden, userId: users.id, name: users.name, banned: users.banned, threadId: threads.id, title: threads.title })
      .from(reports).innerJoin(posts, eq(posts.id, reports.postId)).innerJoin(users, eq(users.id, posts.authorId)).innerJoin(threads, eq(threads.id, posts.threadId))
      .where(eq(reports.resolved, false)).orderBy(asc(reports.createdAt)).limit(100),
    db.select({ ...threadSummary, hidden: threads.hidden, banned: users.banned }).from(threads).innerJoin(users, eq(users.id, threads.authorId)).orderBy(desc(threads.createdAt)).limit(100),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.banned, true)).orderBy(asc(users.id)).limit(100),
    db.select({ id: posts.id, body: posts.body, threadId: threads.id, title: threads.title }).from(posts).innerJoin(threads, eq(threads.id, posts.threadId)).where(eq(posts.hidden, true)).orderBy(desc(posts.createdAt)).limit(100),
  ]);
  return { reports: queue, threads: recent, bannedUsers, hiddenPosts };
}
export async function moderate(binding: D1Database, id: string, input: z.infer<typeof moderationInput>, principal?: AdminPrincipal) {
  const db = database(binding);
  const audit = auditInsert(binding, "admin", "moderate_community", input.kind, id, { principal, patch: input });
  if (input.kind === "thread") {
    const { kind, ...patch } = input;
    if (Object.keys(patch).length === 0) throw new HttpError(400, "请选择管理操作。");
    await db.batch([db.update(threads).set(patch).where(eq(threads.id, id)), audit]);
  } else if (input.kind === "post") {
    await db.batch([db.update(posts).set({ hidden: input.hidden }).where(eq(posts.id, id)), db.update(threads).set({ hidden: input.hidden }).where(eq(threads.id, id)), audit]);
  } else if (input.kind === "user") {
    await db.batch([db.update(users).set({ banned: input.banned }).where(eq(users.id, id)), audit]);
  } else await db.batch([db.update(reports).set({ resolved: input.resolved }).where(eq(reports.id, id)), audit]);
  return { ok: true };
}
