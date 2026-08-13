import { and, eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { accountsTable, animeTable, castCreditsTable, researchSourcesTable } from "~/infrastructure/db/schema";

import type { SourceRecord } from "./types";

async function readSourceRecord(db: D1Database, id: string, enabledOnly: boolean): Promise<SourceRecord | null> {
  const filter = enabledOnly
    ? and(eq(researchSourcesTable.id, id), eq(researchSourcesTable.enabled, true))
    : eq(researchSourcesTable.id, id);
  const row = await database(db).select({
    id: researchSourcesTable.id,
    animeId: researchSourcesTable.animeId,
    animeTitle: animeTable.titleZh,
    accountId: researchSourcesTable.accountId,
    accountOwnerType: accountsTable.ownerType,
    accountOwnerId: accountsTable.ownerId,
    accountPlatform: accountsTable.platform,
    accountHandle: accountsTable.handle,
    accountVerified: accountsTable.verified,
    castCreditId: castCreditsTable.id,
    sourceType: researchSourcesTable.sourceType,
    changeKind: researchSourcesTable.changeKind,
    label: researchSourcesTable.label,
    url: researchSourcesTable.url,
    itemUrlTemplate: researchSourcesTable.itemUrlTemplate,
    trustLevel: researchSourcesTable.trustLevel,
    cadenceProfile: researchSourcesTable.cadenceProfile,
    pollIntervalMin: researchSourcesTable.pollIntervalMin,
    etag: researchSourcesTable.etag,
    lastModified: researchSourcesTable.lastModified,
    cursor: researchSourcesTable.cursor,
  }).from(researchSourcesTable)
    .leftJoin(animeTable, eq(animeTable.id, researchSourcesTable.animeId))
    .leftJoin(accountsTable, eq(accountsTable.id, researchSourcesTable.accountId))
    .leftJoin(castCreditsTable, and(
      eq(castCreditsTable.animeId, researchSourcesTable.animeId),
      eq(castCreditsTable.personId, accountsTable.ownerId),
    ))
    .where(filter).get();
  if (!row) return null;
  const sourceIdentity = row.accountOwnerType === "anime" ? "official"
    : row.accountOwnerType === "person" && row.castCreditId ? "cast"
      : row.trustLevel === "official" ? "official"
        : row.trustLevel === "verified_creator" ? "creator" : "community";
  const { castCreditId: _, ...source } = row;
  return { ...source, sourceIdentity };
}

export async function readSource(db: D1Database, id: string): Promise<SourceRecord | null> {
  return readSourceRecord(db, id, true);
}

export async function readBatchSource(db: D1Database, id: string): Promise<SourceRecord | null> {
  return readSourceRecord(db, id, false);
}

export async function markSourceSuccess(
  db: D1Database,
  source: SourceRecord,
  etag: string | null,
  lastModified: string | null,
): Promise<void> {
  await database(db).update(researchSourcesTable).set({
    lastCheckedAt: sql`CURRENT_TIMESTAMP`,
    etag: sql`COALESCE(${etag}, ${researchSourcesTable.etag})`,
    lastModified: sql`COALESCE(${lastModified}, ${researchSourcesTable.lastModified})`,
    failureCount: 0,
    lastError: null,
    leaseUntil: null,
    nextCheckAt: sql`CASE
      WHEN ${researchSourcesTable.urgencyUntil} > CURRENT_TIMESTAMP THEN datetime('now', '+2 minutes')
      ELSE datetime('now', '+' || ${researchSourcesTable.pollIntervalMin} || ' minutes')
    END`,
  }).where(eq(researchSourcesTable.id, source.id));
}

export async function markSourceFailure(db: D1Database, sourceId: string, error: unknown): Promise<void> {
  await database(db).update(researchSourcesTable).set({
    lastCheckedAt: sql`CURRENT_TIMESTAMP`,
    failureCount: sql`${researchSourcesTable.failureCount} + 1`,
    lastError: error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800),
    leaseUntil: null,
    nextCheckAt: sql`datetime('now', '+' || MIN(360, 5 * (${researchSourcesTable.failureCount} + 1)) || ' minutes')`,
  }).where(eq(researchSourcesTable.id, sourceId));
}
