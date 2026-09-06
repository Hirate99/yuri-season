import type {
  AdminAnimeResources,
  AdminDashboard,
  SearchMemoryHitSummary,
  SearchMemorySummary,
} from "@/domain";
import { fetchAdminDashboard, fetchAdminResources, fetchSearchMemory } from "./admin-dashboard";
import { mapConcurrent } from "./map-concurrent";

export type DiscoveryContext = {
  dashboard: AdminDashboard;
  resources: Record<string, AdminAnimeResources>;
  memory: SearchMemorySummary[];
  memoryHits: SearchMemoryHitSummary[];
};

export async function fetchDiscoveryContext(): Promise<DiscoveryContext> {
  const dashboard = await fetchAdminDashboard();

  const [resourcePairs, memory] = await Promise.all([
    mapConcurrent(
      dashboard.anime,
      4,
      async (anime) => [anime.id, await fetchAdminResources(anime.id)] as const,
    ),
    fetchSearchMemory(true),
  ]);

  return {
    dashboard,
    resources: Object.fromEntries(resourcePairs),
    memory: memory.records,
    memoryHits: memory.hits ?? [],
  };
}
