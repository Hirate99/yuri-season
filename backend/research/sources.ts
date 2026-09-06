import { and, eq } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import {
  accountsTable,
  animeTable,
  castCreditsTable,
  researchSourcesTable,
} from "~/infrastructure/db/schema";
import { sourceCheckQuery } from "~/repositories/source-checks";

import type { SourceRecord } from "./types";

async function readSourceRecord(
  db: D1Database,
  id: string,
  enabledOnly: boolean,
): Promise<SourceRecord | null> {
  const filter = enabledOnly
    ? and(eq(researchSourcesTable.id, id), eq(researchSourcesTable.enabled, true))
    : eq(researchSourcesTable.id, id);

  const row = await database(db)
    .select({
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
    })
    .from(researchSourcesTable)
    .leftJoin(animeTable, eq(animeTable.id, researchSourcesTable.animeId))
    .leftJoin(accountsTable, eq(accountsTable.id, researchSourcesTable.accountId))
    .leftJoin(
      castCreditsTable,
      and(
        eq(castCreditsTable.animeId, researchSourcesTable.animeId),
        eq(castCreditsTable.personId, accountsTable.ownerId),
      ),
    )
    .where(filter)
    .get();
  if (!row) return null;

  const sourceIdentity =
    row.accountOwnerType === "anime"
      ? "official"
      : row.accountOwnerType === "person" && row.castCreditId
        ? "cast"
        : row.trustLevel === "official"
          ? "official"
          : row.trustLevel === "verified_creator"
            ? "creator"
            : "community";

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
  await sourceCheckQuery(db, { sourceId: source.id, outcome: "success", etag, lastModified });
}

export async function markSourceFailure(
  db: D1Database,
  sourceId: string,
  error: unknown,
): Promise<void> {
  await sourceCheckQuery(db, {
    sourceId,
    outcome: "failure",
    error: (error instanceof Error ? error.message : String(error)).slice(0, 800),
  });
}
