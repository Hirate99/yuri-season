import { sql } from "drizzle-orm";
import { type AnySQLiteColumn, check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { animeTable } from "./anime";

const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// Better Auth owns these models; existing `accounts` are external social sources.
export const authUsers = sqliteTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  banned: integer("banned", { mode: "boolean" }).notNull().default(false),
  lastPostedAt: integer("last_posted_at").notNull().default(0),
  ...timestamps(),
});
export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps(),
}, (t) => [index("auth_sessions_user").on(t.userId)]);
export const authAccounts = sqliteTable("auth_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps(),
}, (t) => [index("auth_accounts_user").on(t.userId), uniqueIndex("auth_accounts_provider").on(t.providerId, t.accountId)]);
export const authVerifications = sqliteTable("auth_verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps(),
}, (t) => [index("auth_verifications_identifier").on(t.identifier)]);
export const authRateLimits = sqliteTable("auth_rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

export const communityThreads = sqliteTable("community_threads", {
  id: text("id").primaryKey(),
  animeId: text("anime_id").notNull().references(() => animeTable.id),
  authorId: text("author_id").notNull().references(() => authUsers.id),
  title: text("title").notNull(),
  episode: integer("episode"),
  spoiler: integer("spoiler", { mode: "boolean" }).notNull().default(false),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  lastActivityAt: integer("last_activity_at").notNull(),
}, (t) => [index("community_threads_anime").on(t.animeId, t.hidden, t.pinned, t.lastActivityAt, t.id), index("community_threads_author").on(t.authorId, t.createdAt)]);
export const communityPosts = sqliteTable("community_posts", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => communityThreads.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => authUsers.id),
  body: text("body").notNull(),
  floor: integer("floor"),
  parentPostId: text("parent_post_id").references((): AnySQLiteColumn => communityPosts.id),
  replyToId: text("reply_to_id").references((): AnySQLiteColumn => communityPosts.id),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [
  check("community_posts_shape", sql`(${t.parentPostId} is null and ${t.floor} is not null and ${t.floor} > 0) or (${t.parentPostId} is not null and ${t.floor} is null)`),
  uniqueIndex("community_posts_floor").on(t.threadId, t.floor), index("community_posts_comments").on(t.parentPostId, t.createdAt, t.id), index("community_posts_author").on(t.authorId, t.createdAt),
]);
export const communityLikes = sqliteTable("community_likes", {
  postId: text("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.postId, t.userId] }), index("community_likes_user").on(t.userId)]);
export const communityReports = sqliteTable("community_reports", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").notNull().references(() => authUsers.id),
  reason: text("reason").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
}, (t) => [uniqueIndex("community_reports_once").on(t.postId, t.reporterId), index("community_reports_queue").on(t.resolved, t.createdAt)]);
