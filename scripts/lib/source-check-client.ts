import type { SourceCheckWrite } from "@/domain";
import { rpcData } from "@/lib/rpc";
import { adminApi } from "./admin-dashboard";

export async function submitSourceChecks(checks: SourceCheckWrite[]) {
  return rpcData(adminApi().api.admin.research["source-checks"].$post({ json: { checks } }));
}
