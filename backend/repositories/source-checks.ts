import type { SourceCheckWrite } from "@/domain";
import { and, eq, isNull, or, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { researchSourcesTable } from "~/infrastructure/db/schema";

// Supplied timestamps are replay-guarded; Worker checks use the database clock.
export function sourceCheckQuery(db: D1Database, check: Omit<SourceCheckWrite, "checkedAt"> & { checkedAt?: string }) {
  const checkedAt = check.checkedAt ?? sql`CURRENT_TIMESTAMP`;
  return database(db).update(researchSourcesTable).set({
    lastCheckedAt: checkedAt,
    leaseUntil: null,
    ...(check.outcome === "success" ? {
      etag: check.etag ?? undefined,
      lastModified: check.lastModified ?? undefined,
      failureCount: 0,
      lastError: null,
      nextCheckAt: sql`CASE
        WHEN ${researchSourcesTable.urgencyUntil} > CURRENT_TIMESTAMP THEN datetime(${checkedAt}, '+2 minutes')
        ELSE datetime(${checkedAt}, '+' || ${researchSourcesTable.pollIntervalMin} || ' minutes')
      END`,
    } : {
      failureCount: sql`${researchSourcesTable.failureCount} + 1`,
      lastError: check.error,
      nextCheckAt: sql`datetime(${checkedAt}, '+' || MIN(360, 5 * (${researchSourcesTable.failureCount} + 1)) || ' minutes')`,
    }),
  }).where(and(
    eq(researchSourcesTable.id, check.sourceId),
    check.checkedAt === undefined ? undefined : or(
      isNull(researchSourcesTable.lastCheckedAt),
      sql`datetime(${researchSourcesTable.lastCheckedAt}) < datetime(${checkedAt})`,
    ),
  ));
}

export async function recordSourceChecks(db: D1Database, checks: SourceCheckWrite[]) {
  const [first, ...rest] = checks;
  if (!first) return { received: 0, updated: 0 };
  const orm = database(db);
  const results = await orm.batch([sourceCheckQuery(db, first), ...rest.map((check) => sourceCheckQuery(db, check))]);
  return {
    received: checks.length,
    updated: results.reduce((total, result) => total + (result.meta.changes ?? 0), 0),
  };
}
