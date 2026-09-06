import type { SourceWrite } from "@/domain";
import { and, eq, sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { researchSourcesTable } from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { createId } from "~/shared/id";
import { assertSourceAccount } from "./resource-context";
import type { ResourceAudit, ResourceChangeAudit } from "./resource-write";
import { resourceAuditSnapshot } from "./resource-audit";

export async function createSource(db: D1Database, animeId: string, value: SourceWrite, audit: ResourceAudit): Promise<string> {
  await assertSourceAccount(db, animeId, value.accountId);
  const id = createId("source");
  const orm = database(db);
  const insert = orm.insert(researchSourcesTable).values({
    id,
    animeId,
    ...value,
    failureCount: 0,
  });
  await orm.batch([insert, audit(id)]);
  return id;
}

export async function updateSource(db: D1Database, animeId: string, id: string, value: SourceWrite, audit: ResourceChangeAudit): Promise<void> {
  const before = await resourceAuditSnapshot(db, animeId, "source", id);
  await assertSourceAccount(db, animeId, value.accountId);
  const orm = database(db);
  const update = orm.update(researchSourcesTable).set({
    ...value,
    nextCheckAt: value.enabled ? sql`COALESCE(next_check_at, CURRENT_TIMESTAMP)` : null,
    leaseUntil: null,
  }).where(and(eq(researchSourcesTable.id, id), eq(researchSourcesTable.animeId, animeId)));
  const result = (await orm.batch([update, audit(before)]))[0];
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到来源。");
}
