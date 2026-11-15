import type { AdminAnimeResources, AdminDashboard } from "@/domain";
import { createApiClient, rpcData } from "@/lib/rpc";
import { adminHeaders } from "./admin-headers";
import { requiredResearchEnv } from "./research-env";

export { requiredResearchEnv } from "./research-env";

export function researchBaseUrl(): string {
  return requiredResearchEnv("YURI_RADAR_URL").replace(/\/$/, "");
}

export function adminApi() {
  return createApiClient(researchBaseUrl(), adminHeaders(requiredResearchEnv("YURI_ADMIN_TOKEN")));
}

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  return rpcData(adminApi().api.admin.dashboard.$get());
}

export async function fetchAdminResources(animeId: string): Promise<AdminAnimeResources> {
  return rpcData(adminApi().api.admin.anime[":id"].resources.$get({ param: { id: animeId } }));
}

export async function fetchResearchSources() {
  return rpcData(adminApi().api.admin.research.sources.$get());
}
