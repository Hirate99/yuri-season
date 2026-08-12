import type { AdminPublication, AuditEntry } from "@/domain";
import type { AuditRow, PublicationRow } from "../db/admin-rows";

function parseAuditDetail(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function mapPublication(row: PublicationRow): AdminPublication {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    animeTitle: row.anime_title,
    title: row.title,
    url: row.url,
    sourceName: row.source_name,
    publishedAt: row.published_at,
    autoPublished: row.auto_published === 1,
  };
}

export function mapAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    actorType: row.actor_type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detail: parseAuditDetail(row.detail_json),
    createdAt: row.created_at,
  };
}
