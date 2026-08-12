import type { SourceCheckWrite } from "@/domain";
import { adminHeaders } from "./admin-headers";
import { requiredResearchEnv, researchBaseUrl } from "./admin-dashboard";

export async function submitSourceChecks(checks: SourceCheckWrite[]) {
  const response = await fetch(`${researchBaseUrl()}/api/admin/research/source-checks`, {
    method: "POST",
    headers: adminHeaders(requiredResearchEnv("YURI_ADMIN_TOKEN"), { "content-type": "application/json" }),
    body: JSON.stringify({ checks }),
  });
  if (!response.ok) throw new Error(`source checks returned ${response.status}`);
  return response.json() as Promise<{ received: number; updated: number }>;
}
