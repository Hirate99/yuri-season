import type { AdminDashboard } from "@/domain";
import type { SourceRecord } from "~/research/types";

type ConditionalState = { etag?: string | null; lastModified?: string | null };

export function adminSourceRecord(
  source: AdminDashboard["sources"][number],
  previous?: ConditionalState,
): SourceRecord {
  return {
    id: source.id,
    animeId: null,
    animeTitle: source.animeTitle,
    sourceType: source.sourceType,
    changeKind: source.changeKind,
    label: source.label,
    url: source.url,
    itemUrlTemplate: source.itemUrlTemplate,
    trustLevel: source.trustLevel as SourceRecord["trustLevel"],
    cadenceProfile: source.cadenceProfile,
    pollIntervalMin: source.pollIntervalMin,
    etag: previous?.etag ?? null,
    lastModified: previous?.lastModified ?? null,
    cursor: null,
  };
}
