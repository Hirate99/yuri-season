import type { SourceCheckWrite } from "@/domain";
import type { BatchItem } from "drizzle-orm/batch";
import { and, eq, or, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { researchSourcesTable } from "~/infrastructure/db/schema";

function sourceCheckQuery(db: D1Database, check: SourceCheckWrite) {
  const orm = database(db);
  const where = and(
    eq(researchSourcesTable.id, check.sourceId),
    or(
      sql`${researchSourcesTable.lastCheckedAt} IS NULL`,
      sql`datetime(${researchSourcesTable.lastCheckedAt}) < datetime(${check.checkedAt})`,
    ),
  );
  if (check.outcome === "success") {
    return orm.update(researchSourcesTable).set({
      lastCheckedAt: check.checkedAt,
      etag: sql`COALESCE(${check.etag ?? null}, ${researchSourcesTable.etag})`,
      lastModified: sql`COALESCE(${check.lastModified ?? null}, ${researchSourcesTable.lastModified})`,
      failureCount: 0,
      lastError: null,
      leaseUntil: null,
      nextCheckAt: sql`CASE
        WHEN ${researchSourcesTable.urgencyUntil} > CURRENT_TIMESTAMP THEN datetime(${check.checkedAt}, '+2 minutes')
        ELSE datetime(${check.checkedAt}, '+' || ${researchSourcesTable.pollIntervalMin} || ' minutes')
      END`,
    }).where(where);
  }
  return orm.update(researchSourcesTable).set({
    lastCheckedAt: check.checkedAt,
    failureCount: sql`${researchSourcesTable.failureCount} + 1`,
    lastError: check.error,
    leaseUntil: null,
    nextCheckAt: sql`datetime(${check.checkedAt}, '+' || MIN(360, 5 * (${researchSourcesTable.failureCount} + 1)) || ' minutes')`,
  }).where(where);
}

export async function recordSourceChecks(db: D1Database, checks: SourceCheckWrite[]) {
  if (checks.length === 0) return { received: 0, updated: 0 };
  const orm = database(db);
  const queries = checks.map((check) => sourceCheckQuery(db, check)) as BatchItem<"sqlite">[];
  const results = await orm.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return {
    received: checks.length,
    updated: results.reduce((total, result) => total + (result.meta.changes ?? 0), 0),
  };
}
