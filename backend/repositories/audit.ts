import type { AuditEntry } from "@/domain";
import { sql } from "drizzle-orm";
import { database } from "~/infrastructure/db/client";
import { auditLogTable } from "~/infrastructure/db/schema";
import { createId } from "~/shared/id";

export function auditInsert(
  db: D1Database,
  actorType: AuditEntry["actorType"],
  action: string,
  entityType: string,
  entityId: string,
  detail: Record<string, unknown> = {},
) {
  return database(db)
    .insert(auditLogTable)
    .values({
      id: createId("audit"),
      actorType,
      action,
      entityType,
      entityId,
      detailJson: JSON.stringify(detail),
      createdAt: sql`CURRENT_TIMESTAMP`,
    });
}

export async function recordAudit(
  db: D1Database,
  actorType: AuditEntry["actorType"],
  action: string,
  entityType: string,
  entityId: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await auditInsert(db, actorType, action, entityType, entityId, detail).run();
}
