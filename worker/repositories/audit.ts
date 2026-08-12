import type { AuditEntry } from "@/domain";
import { createId } from "../http";

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
  await auditStatement(db, actorType, action, entityType, entityId, detail).run();
}
