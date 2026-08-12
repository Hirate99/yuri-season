import type { AdminDashboard } from "@/domain";
import type { SourceRecord } from "../../worker/research/types";

type ConditionalState = { etag?: string | null; lastModified?: string | null };

export function adminSourceRecord(
  source: AdminDashboard["sources"][number],
  previous?: ConditionalState,
): SourceRecord {
  return {
    id: source.id,
    anime_id: null,
    anime_title: source.animeTitle,
    source_type: source.sourceType,
    change_kind: source.changeKind,
    label: source.label,
    url: source.url,
    item_url_template: source.itemUrlTemplate,
    trust_level: source.trustLevel as SourceRecord["trust_level"],
    cadence_profile: source.cadenceProfile,
    poll_interval_min: source.pollIntervalMin,
    etag: previous?.etag ?? null,
    last_modified: previous?.lastModified ?? null,
    cursor: null,
  };
}
