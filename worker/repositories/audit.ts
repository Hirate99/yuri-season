import type { AuditEntry } from "@/domain";
import { sql } from "drizzle-orm";
import { database } from "../db/client";
import { auditLogTable } from "../db/schema";
import { createId } from "../http";

export function auditInsert(
  db: D1Database,
  actorType: AuditEntry["actorType"],
  action: string,
  entityType: string,
  entityId: string,
  detail: Record<string, unknown> = {},
) {
  return database(db).insert(auditLogTable).values({
    id: createId("audit"),
    actorType,
    action,
    entityType,
    entityId,
    detailJson: JSON.stringify(detail),
    createdAt: sql`CURRENT_TIMESTAMP`,
  });
}

export function auditStatement(
  db: D1Database,
  actorType: AuditEntry["actorType"],
  action: string,
  entityType: string,
  entityId: string,
  detail: Record<string, unknown> = {},
): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO audit_log (id, actor_type, action, entity_type, entity_id, detail_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(createId("audit"), actorType, action, entityType, entityId, JSON.stringify(detail));
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
