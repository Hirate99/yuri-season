import type { SearchMemoryWrite } from "@/domain";
import { rpcData } from "@/lib/rpc";
import { adminApi } from "./admin-dashboard";

export async function rememberSearchRecords(records: SearchMemoryWrite[]) {
  return rpcData(adminApi().api.admin.research.memory.$post({ json: { records } }));
}
