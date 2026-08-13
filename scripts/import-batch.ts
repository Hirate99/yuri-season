import type { ResearchBatch } from "@/domain";
import { rpcData } from "@/lib/rpc";
import { adminApi } from "./lib/admin-dashboard";

const path = process.argv[2];
if (!path) throw new Error("usage: bun run research:import <batch.json>");

const file = Bun.file(path);
if (!await file.exists()) throw new Error(`batch does not exist: ${path}`);
const result = await rpcData(adminApi().api.admin.batches.$post({ json: await file.json() as ResearchBatch }));
process.stdout.write(JSON.stringify({
  ok: true,
  runId: result.runId ?? null,
  duplicate: Boolean(result.duplicate),
  observations: result.observations ?? 0,
  candidates: result.candidates ?? 0,
}, null, 2));
