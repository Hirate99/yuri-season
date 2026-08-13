import type { SourceWrite } from "@/domain";
import { and, eq, sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { researchSourcesTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { assertSourceAccount } from "./resource-context";

export async function createSource(db: D1Database, animeId: string, value: SourceWrite): Promise<string> {
  await assertSourceAccount(db, animeId, value.accountId);
  const id = createId("source");
  await database(db).insert(researchSourcesTable).values({
    id,
    animeId,
    accountId: value.accountId,
    sourceType: value.sourceType,
    changeKind: value.changeKind,
    label: value.label,
    url: value.url,
    itemUrlTemplate: value.itemUrlTemplate,
    trustLevel: value.trustLevel,
    pollIntervalMin: value.pollIntervalMin,
    cadenceProfile: value.cadenceProfile,
    enabled: value.enabled,
    failureCount: 0,
  }).run();
  return id;
}

export async function updateSource(db: D1Database, animeId: string, id: string, value: SourceWrite): Promise<void> {
  await assertSourceAccount(db, animeId, value.accountId);
  const result = await database(db).update(researchSourcesTable).set({
    accountId: value.accountId,
    sourceType: value.sourceType,
    changeKind: value.changeKind,
    label: value.label,
    url: value.url,
    itemUrlTemplate: value.itemUrlTemplate,
    trustLevel: value.trustLevel,
    pollIntervalMin: value.pollIntervalMin,
    cadenceProfile: value.cadenceProfile,
    enabled: value.enabled,
    nextCheckAt: value.enabled ? sql`COALESCE(next_check_at, CURRENT_TIMESTAMP)` : null,
    leaseUntil: null,
  }).where(and(eq(researchSourcesTable.id, id), eq(researchSourcesTable.animeId, animeId))).run();
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到来源。");
}
