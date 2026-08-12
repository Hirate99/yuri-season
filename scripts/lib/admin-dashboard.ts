import type { AdminDashboard } from "@/domain";
import { adminHeaders } from "./admin-headers";
import { requiredResearchEnv } from "./research-env";

export { requiredResearchEnv } from "./research-env";

export function researchBaseUrl(): string {
  return requiredResearchEnv("YURI_RADAR_URL").replace(/\/$/, "");
}

export async function fetchAdminJson<T>(path: string): Promise<T> {
  const response = await fetch(`${researchBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    headers: adminHeaders(requiredResearchEnv("YURI_ADMIN_TOKEN")),
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  return fetchAdminJson<AdminDashboard>("/api/admin/dashboard");
}
