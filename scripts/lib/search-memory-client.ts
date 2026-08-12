import type { SearchMemoryWrite } from "@/domain";
import { adminHeaders } from "./admin-headers";
import { requiredResearchEnv } from "./admin-dashboard";

export async function rememberSearchRecords(records: SearchMemoryWrite[]) {
  const baseUrl = requiredResearchEnv("YURI_RADAR_URL").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/admin/research/memory`, {
    method: "POST",
    headers: adminHeaders(requiredResearchEnv("YURI_ADMIN_TOKEN"), { "content-type": "application/json" }),
    body: JSON.stringify({ records }),
  });
  if (!response.ok) throw new Error(`search memory returned ${response.status}`);
  return response.json() as Promise<{ records: number; hits: number }>;
}
