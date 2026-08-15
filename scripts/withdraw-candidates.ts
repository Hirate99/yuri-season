import { rpcData } from "@/lib/rpc";
import { adminApi } from "./lib/admin-dashboard";

const [reason, ...candidateIds] = process.argv.slice(2);
if (!reason || candidateIds.length === 0) {
  throw new Error("usage: bun scripts/withdraw-candidates.ts <reason> <candidate-id> [...candidate-id]");
}

const api = adminApi();
for (const id of candidateIds) {
  await rpcData(api.api.admin.candidates[":id"].decision.$post({
    param: { id },
    json: { decision: "withdraw", reason },
  }));
}

process.stdout.write(JSON.stringify({ ok: true, withdrawn: candidateIds.length }, null, 2));
