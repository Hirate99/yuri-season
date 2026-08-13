import type { BatchAccountDiscovery, BatchCandidate, BatchObservation, CandidateDraft } from "@/domain";
import { and, eq } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { accountsTable, castCreditsTable, claimsTable } from "~/infrastructure/db/schema";
import { stableFingerprint } from "~/shared/fingerprint";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";

import { accountMatchesPostUrl, readResolvedAccount } from "./batch-sources";
import type { SourceRecord } from "./types";

function normalizedPlatformObjectId(candidate: BatchCandidate, observation: BatchObservation): string | null {
  const value = candidate.platformObjectId ?? observation.sourceItemId;
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 240) : null;
}

export async function prepareBatchCandidate(
  db: D1Database,
  candidate: BatchCandidate,
  observation: BatchObservation,
  source: SourceRecord,
  observationId: string,
): Promise<CandidateDraft> {
  const animeId = candidate.animeId ?? candidate.animeIds?.[0] ?? source.animeId;
  const common: CandidateDraft = {
    ...candidate,
    observationId,
    animeId,
    sourceIdentity: source.sourceIdentity
      ?? (source.trustLevel === "official" ? "official" : source.trustLevel === "verified_creator" ? "creator" : "community"),
    sourceName: source.label,
    presentationMode: "link_only",
    discoveredBy: "local_skill",
    extractorVersion: "local-codex@2",
  };

  if (candidate.contentClass === "cast_post") {
    if (!animeId || !candidate.personId || !candidate.accountId) {
      throw new HttpError(400, "A cast post requires animeId, personId, and accountId.");
    }
    const account = await readResolvedAccount(db, candidate.accountId);
    if (!account?.verified || account.owner_type !== "person" || account.owner_id !== candidate.personId) {
      throw new HttpError(400, "A cast post must use a verified account owned by that person.");
    }
    if (source.accountId !== account.id) {
      throw new HttpError(400, "The observation and cast post must use the same verified account.");
    }
    if (!accountMatchesPostUrl(account, candidate.url)) {
      throw new HttpError(400, "The cast post URL does not match the verified account.");
    }
    const creditFilter = candidate.characterId
      ? and(
          eq(castCreditsTable.animeId, animeId),
          eq(castCreditsTable.personId, candidate.personId),
          eq(castCreditsTable.characterId, candidate.characterId),
        )
      : and(eq(castCreditsTable.animeId, animeId), eq(castCreditsTable.personId, candidate.personId));
    const credit = await database(db).select({ id: castCreditsTable.id }).from(castCreditsTable)
      .where(creditFilter).get();
    if (!credit) throw new HttpError(400, "没有命中本作的角色—声优关系");
    const platformObjectId = normalizedPlatformObjectId(candidate, observation);
    if (!platformObjectId) throw new HttpError(400, "A cast post requires a stable platform object ID.");
    return {
      ...common,
      accountId: account.id,
      platformObjectId,
      originKey: `cast:${animeId}:${account.id}:${platformObjectId}`,
      sourceIdentity: "cast",
      sourceName: account.owner_name,
      sourceAccount: account.handle,
    };
  }

  if (candidate.contentClass === "fanwork") {
    if (!animeId || !candidate.media?.creatorName?.trim() || !candidate.media.originalUrl) {
      throw new HttpError(400, "A fan-work candidate requires a work, creator, and original URL.");
    }
    if (!["fanart", "fan_video", "cosplay"].includes(candidate.media.contentClass)) {
      throw new HttpError(400, "Fan-work media must be fanart, fan_video, or cosplay.");
    }
    const originalUrl = candidate.media.originalUrl;
    if (candidate.url !== originalUrl) throw new HttpError(400, "The candidate URL must be the creator's original URL.");
    const platformObjectId = normalizedPlatformObjectId(candidate, observation) ?? originalUrl;
    const originHash = await stableFingerprint(`${platformObjectId}|${originalUrl}`);
    return {
      ...common,
      platformObjectId,
      originKey: `fanwork:${originHash}`,
      sourceIdentity: "community",
      sourceName: candidate.media.creatorName.trim(),
      sourceAccount: null,
      media: { ...candidate.media, originalUrl, presentationMode: "link_only" },
    };
  }

  return common;
}

export async function storeAccountDiscovery(
  db: D1Database,
  observationId: string,
  value: BatchAccountDiscovery,
): Promise<boolean> {
  const orm = database(db);
  const credit = await orm.select({ id: castCreditsTable.id }).from(castCreditsTable)
    .where(and(eq(castCreditsTable.animeId, value.animeId), eq(castCreditsTable.personId, value.personId)))
    .get();
  if (!credit) throw new HttpError(400, "The discovered account owner has no cast credit for this work.");

  const claimValue = {
    animeId: value.animeId,
    personId: value.personId,
    platform: value.platform,
    handle: value.handle?.trim() || null,
    url: value.url,
    verificationSourceUrl: value.verificationSourceUrl,
    review: value.review,
  };
  const fingerprint = await stableFingerprint(`account_identity|${value.personId}|${value.platform}|${value.url}`);
  const priorClaim = await orm.select({ id: claimsTable.id }).from(claimsTable)
    .where(eq(claimsTable.fingerprint, fingerprint)).get();
  if (priorClaim) return false;

  const existing = await orm.select({
    id: accountsTable.id,
    ownerType: accountsTable.ownerType,
    ownerId: accountsTable.ownerId,
  }).from(accountsTable).where(eq(accountsTable.url, value.url)).get();
  if (existing && (existing.ownerType !== "person" || existing.ownerId !== value.personId)) {
    throw new HttpError(409, "The discovered account URL belongs to another owner.");
  }
  const rejected = value.review.decision === "reject";
  const accountId = existing?.id ?? (rejected ? null : createId("account"));
  if (!existing && accountId) {
    await orm.insert(accountsTable).values({
      id: accountId,
      ownerType: "person",
      ownerId: value.personId,
      platform: value.platform,
      handle: value.handle?.trim() || null,
      url: value.url,
      verified: false,
      monitorMode: "local",
      verificationSourceUrl: value.verificationSourceUrl,
      verifiedAt: null,
    });
  }
  await orm.insert(claimsTable).values({
    id: createId("claim"),
    observationId,
    animeId: value.animeId,
    subjectType: "account",
    subjectId: accountId,
    predicate: "account_identity",
    valueJson: JSON.stringify(claimValue),
    extractionMethod: "local_skill",
    confidence: value.review.confidence,
    status: rejected ? "rejected" : "proposed",
    fingerprint,
  });
  return Boolean(!existing && accountId);
}
