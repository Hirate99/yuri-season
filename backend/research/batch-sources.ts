import type { BatchInlineSource, BatchObservation } from "@/domain";
import { and, desc, eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { accountsTable, animeTable, peopleTable, researchSourcesTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

import { readBatchSource } from "./sources";
import type { SourceRecord } from "./types";

export type ResolvedAccount = {
  id: string;
  owner_type: "anime" | "person" | "organization";
  owner_id: string;
  owner_name: string;
  platform: string;
  handle: string | null;
  url: string;
  verified: boolean;
};

export async function readResolvedAccount(db: D1Database, accountId: string): Promise<ResolvedAccount | null> {
  return await database(db).select({
    id: accountsTable.id,
    owner_type: accountsTable.ownerType,
    owner_id: accountsTable.ownerId,
    owner_name: sql<string>`COALESCE(${peopleTable.name}, ${animeTable.titleZh}, ${accountsTable.handle}, ${accountsTable.platform})`,
    platform: accountsTable.platform,
    handle: accountsTable.handle,
    url: accountsTable.url,
    verified: accountsTable.verified,
  }).from(accountsTable)
    .leftJoin(peopleTable, and(eq(accountsTable.ownerType, "person"), eq(peopleTable.id, accountsTable.ownerId)))
    .leftJoin(animeTable, and(eq(accountsTable.ownerType, "anime"), eq(animeTable.id, accountsTable.ownerId)))
    .where(eq(accountsTable.id, accountId))
    .get() ?? null;
}

async function ensureAccountSource(db: D1Database, account: ResolvedAccount): Promise<SourceRecord> {
  const orm = database(db);
  const existing = await orm.select({ id: researchSourcesTable.id }).from(researchSourcesTable)
    .where(and(eq(researchSourcesTable.accountId, account.id), eq(researchSourcesTable.sourceType, "social")))
    .orderBy(desc(researchSourcesTable.enabled), researchSourcesTable.id)
    .get();
  if (existing) {
    const source = await readBatchSource(db, existing.id);
    if (source) return source;
  }
  const urlMatch = await orm.select({ id: researchSourcesTable.id, account_id: researchSourcesTable.accountId })
    .from(researchSourcesTable).where(eq(researchSourcesTable.url, account.url)).get();
  if (urlMatch) {
    if (urlMatch.account_id !== account.id) throw new HttpError(409, "The account URL belongs to another source.");
    const source = await readBatchSource(db, urlMatch.id);
    if (source) return source;
  }
  const sourceId = createId("source");
  await orm.insert(researchSourcesTable).values({
    id: sourceId,
    animeId: null,
    accountId: account.id,
    sourceType: "social",
    changeKind: "feed_candidate",
    label: `${account.owner_name} ${account.platform}`,
    url: account.url,
    trustLevel: "verified_creator",
    publicTextMode: "full_with_translation",
    maxPublicCharacters: 6000,
    pollIntervalMin: 10080,
    cadenceProfile: "local",
    enabled: false,
    failureCount: 0,
  });
  const source = await readBatchSource(db, sourceId);
  if (!source) throw new HttpError(500, "Failed to create an account source.");
  return source;
}

async function ensureInlineSource(db: D1Database, input: BatchInlineSource): Promise<SourceRecord> {
  const orm = database(db);
  const existing = await orm.select({ id: researchSourcesTable.id }).from(researchSourcesTable)
    .where(eq(researchSourcesTable.url, input.url)).get();
  if (existing) {
    const source = await readBatchSource(db, existing.id);
    if (source) return source;
  }
  const sourceId = createId("source");
  await orm.insert(researchSourcesTable).values({
    id: sourceId,
    animeId: null,
    accountId: null,
    sourceType: input.sourceType,
    changeKind: "feed_candidate",
    label: input.label,
    url: input.url,
    trustLevel: input.trustLevel,
    publicTextMode: input.trustLevel === "community" ? "summary_only" : "link_only",
    maxPublicCharacters: input.trustLevel === "community" ? 800 : 0,
    pollIntervalMin: 10080,
    cadenceProfile: "local",
    enabled: false,
    failureCount: 0,
  });
  const source = await readBatchSource(db, sourceId);
  if (!source) throw new HttpError(500, "Failed to create an inline source.");
  return source;
}

export async function resolveObservationSource(db: D1Database, observation: BatchObservation): Promise<SourceRecord> {
  if (observation.sourceId) {
    const source = await readBatchSource(db, observation.sourceId);
    if (!source) throw new HttpError(400, `Source ${observation.sourceId} does not exist.`);
    return source;
  }
  if (observation.accountId) {
    const account = await readResolvedAccount(db, observation.accountId);
    if (!account?.verified) throw new HttpError(400, "An account observation requires a verified account.");
    return ensureAccountSource(db, account);
  }
  if (observation.source) return ensureInlineSource(db, observation.source);
  throw new HttpError(400, "The observation has no source.");
}

export function accountMatchesPostUrl(account: ResolvedAccount, value: string): boolean {
  const post = new URL(value);
  const home = new URL(account.url);
  const platform = account.platform.toLowerCase();
  if (platform === "x" || platform === "twitter") {
    const allowed = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
    if (!allowed.has(post.hostname.toLowerCase())) return false;
    const expected = home.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    const actual = post.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    return Boolean(expected && actual && expected === actual);
  }
  if (platform === "instagram") return ["instagram.com", "www.instagram.com"].includes(post.hostname.toLowerCase());
  return post.hostname.toLowerCase() === home.hostname.toLowerCase();
}
