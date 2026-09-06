import type { SearchMemoryHitSummary, SearchMemorySummary, SearchMemoryWrite } from "@/domain";
import { and, desc, eq, sql } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { searchMemoryHitsTable, searchMemoryTable } from "~/infrastructure/db/schema";
import { createId } from "~/shared/id";

export type SearchHitOutcome = "seen" | "candidate" | "published" | "held" | "rejected" | "ignored";

export async function resolveSearchHit(
  db: D1Database,
  canonicalUrl: string,
  outcome: SearchHitOutcome,
  links: { observationId?: string; candidateId?: string } = {},
): Promise<number> {
  const values: Partial<typeof searchMemoryHitsTable.$inferInsert> = { outcome };
  if (links.observationId) values.observationId = links.observationId;
  if (links.candidateId) values.candidateId = links.candidateId;

  const result = await database(db)
    .update(searchMemoryHitsTable)
    .set(values)
    .where(eq(searchMemoryHitsTable.canonicalUrl, canonicalUrl))
    .run();

  return result.meta.changes ?? 0;
}

export async function rememberSearch(db: D1Database, records: SearchMemoryWrite[]) {
  const orm = database(db);
  let hitCount = 0;

  for (const record of records) {
    const memoryId = sql<string>`(${orm
      .select({ id: searchMemoryTable.id })
      .from(searchMemoryTable)
      .where(
        and(
          eq(searchMemoryTable.scopeType, record.scopeType),
          eq(searchMemoryTable.scopeId, record.scopeId),
          eq(searchMemoryTable.searchKind, record.searchKind),
          eq(searchMemoryTable.targetKey, record.targetKey),
        ),
      )})`;

    const values = {
      queryText: record.queryText,
      status: record.status,
      cursorJson: JSON.stringify(record.cursor ?? {}),
      lastResultHash: record.lastResultHash,
      lastResultCount: record.lastResultCount,
      usefulResultCount: record.usefulResultCount,
      lastSearchedAt: record.searchedAt,
      nextSearchAt: record.nextSearchAt ?? null,
      notes: record.notes ?? null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    const upsert = orm
      .insert(searchMemoryTable)
      .values({
        id: createId("memory"),
        scopeType: record.scopeType,
        scopeId: record.scopeId,
        searchKind: record.searchKind,
        targetKey: record.targetKey,
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          searchMemoryTable.scopeType,
          searchMemoryTable.scopeId,
          searchMemoryTable.searchKind,
          searchMemoryTable.targetKey,
        ],
        set: values,
      });

    await orm.batch([
      upsert,
      ...record.hits.map((hit) => {
        const content = {
          title: hit.title,
          contentHash: hit.contentHash,
          metadataJson: JSON.stringify(hit.metadata ?? {}),
          lastSeenAt: record.searchedAt,
        };

        return orm
          .insert(searchMemoryHitsTable)
          .values({
            ...content,
            id: createId("hit"),
            memoryId,
            canonicalUrl: hit.canonicalUrl,
            outcome: hit.outcome,
            observationId: hit.observationId ?? null,
            candidateId: hit.candidateId ?? null,
            firstSeenAt: record.searchedAt,
          })
          .onConflictDoUpdate({
            target: [searchMemoryHitsTable.memoryId, searchMemoryHitsTable.canonicalUrl],
            set: {
              ...content,
              outcome: sql`CASE WHEN ${searchMemoryHitsTable.outcome} = 'seen' THEN ${hit.outcome} ELSE ${searchMemoryHitsTable.outcome} END`,
              observationId: hit.observationId ?? sql`${searchMemoryHitsTable.observationId}`,
              candidateId: hit.candidateId ?? sql`${searchMemoryHitsTable.candidateId}`,
            },
          });
      }),
    ]);
    hitCount += record.hits.length;
  }

  return { records: records.length, hits: hitCount };
}

export async function readSearchMemory(db: D1Database): Promise<SearchMemorySummary[]> {
  const rows = await database(db)
    .select({
      id: searchMemoryTable.id,
      scopeType: searchMemoryTable.scopeType,
      scopeId: searchMemoryTable.scopeId,
      searchKind: searchMemoryTable.searchKind,
      targetKey: searchMemoryTable.targetKey,
      queryText: searchMemoryTable.queryText,
      status: searchMemoryTable.status,
      cursorJson: searchMemoryTable.cursorJson,
      lastResultHash: searchMemoryTable.lastResultHash,
      lastResultCount: searchMemoryTable.lastResultCount,
      usefulResultCount: searchMemoryTable.usefulResultCount,
      searchedAt: searchMemoryTable.lastSearchedAt,
      nextSearchAt: searchMemoryTable.nextSearchAt,
      notes: searchMemoryTable.notes,
      seenCount: sql<number>`SUM(CASE WHEN ${searchMemoryHitsTable.outcome} = 'seen' THEN 1 ELSE 0 END)`,
      candidateCount: sql<number>`SUM(CASE WHEN ${searchMemoryHitsTable.outcome} = 'candidate' THEN 1 ELSE 0 END)`,
      publishedCount: sql<number>`SUM(CASE WHEN ${searchMemoryHitsTable.outcome} = 'published' THEN 1 ELSE 0 END)`,
      heldCount: sql<number>`SUM(CASE WHEN ${searchMemoryHitsTable.outcome} = 'held' THEN 1 ELSE 0 END)`,
      rejectedCount: sql<number>`SUM(CASE WHEN ${searchMemoryHitsTable.outcome} = 'rejected' THEN 1 ELSE 0 END)`,
      ignoredCount: sql<number>`SUM(CASE WHEN ${searchMemoryHitsTable.outcome} = 'ignored' THEN 1 ELSE 0 END)`,
    })
    .from(searchMemoryTable)
    .leftJoin(searchMemoryHitsTable, eq(searchMemoryHitsTable.memoryId, searchMemoryTable.id))
    .groupBy(searchMemoryTable.id)
    .orderBy(desc(searchMemoryTable.lastSearchedAt), searchMemoryTable.id)
    .limit(300);

  return rows.map(({ cursorJson, ...row }) => ({
    ...row,
    cursor: JSON.parse(cursorJson || "{}") as Record<string, unknown>,
    scopeType: row.scopeType as SearchMemorySummary["scopeType"],
    searchKind: row.searchKind as SearchMemorySummary["searchKind"],
    status: row.status as SearchMemorySummary["status"],
    searchedAt: row.searchedAt ?? "",
    seenCount: Number(row.seenCount),
    candidateCount: Number(row.candidateCount),
    publishedCount: Number(row.publishedCount),
    heldCount: Number(row.heldCount),
    rejectedCount: Number(row.rejectedCount),
    ignoredCount: Number(row.ignoredCount),
  }));
}

export async function readSearchMemoryHits(db: D1Database): Promise<SearchMemoryHitSummary[]> {
  const rows = await database(db)
    .select({
      memoryId: searchMemoryHitsTable.memoryId,
      canonicalUrl: searchMemoryHitsTable.canonicalUrl,
      title: searchMemoryHitsTable.title,
      contentHash: searchMemoryHitsTable.contentHash,
      outcome: searchMemoryHitsTable.outcome,
      metadataJson: searchMemoryHitsTable.metadataJson,
      firstSeenAt: searchMemoryHitsTable.firstSeenAt,
      lastSeenAt: searchMemoryHitsTable.lastSeenAt,
    })
    .from(searchMemoryHitsTable)
    .innerJoin(searchMemoryTable, eq(searchMemoryTable.id, searchMemoryHitsTable.memoryId))
    .orderBy(desc(searchMemoryHitsTable.lastSeenAt), searchMemoryHitsTable.id)
    .limit(5000);

  return rows.map(({ metadataJson, outcome, ...row }) => ({
    ...row,
    outcome: outcome as SearchMemoryHitSummary["outcome"],
    metadata: JSON.parse(metadataJson || "{}") as Record<string, unknown>,
  }));
}
