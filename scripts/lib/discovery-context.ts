import type {
  AdminAnimeResources,
  AdminDashboard,
  SearchMemoryHitSummary,
  SearchMemorySummary,
} from "@/domain";
import { adminApi } from "./admin-dashboard";
import { rpcData } from "@/lib/rpc";

export type DiscoveryContext = {
  dashboard: Pick<AdminDashboard, "anime" | "seasons" | "recentPublications" | "heldCandidates">;
  resources: Record<string, AdminAnimeResources>;
  memory: SearchMemorySummary[];
  memoryHits: SearchMemoryHitSummary[];
};

export async function fetchDiscoveryContext(
  mode: "routine" | "discovery" = "discovery",
  sourceIds?: string[],
): Promise<DiscoveryContext> {
  return rpcData(
    adminApi().api.admin.research.context.$post({
      json: { mode, sourceIds },
    }),
  );
}
