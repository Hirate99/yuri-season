import { adminHeaders } from "./lib/admin-headers";
import { requiredResearchEnv } from "./lib/research-env";

const path = process.argv[2];
if (!path) throw new Error("usage: bun run research:import <batch.json>");

const body = Bun.file(path);
if (!await body.exists()) throw new Error(`batch does not exist: ${path}`);

const baseUrl = requiredResearchEnv("YURI_RADAR_URL").replace(/\/$/, "");
const response = await fetch(`${baseUrl}/api/admin/batches`, {
  method: "POST",
  headers: adminHeaders(requiredResearchEnv("YURI_ADMIN_TOKEN"), {
    "content-type": "application/json; charset=utf-8",
  }),
  body,
});
const responseText = await response.text();
if (!response.ok) throw new Error(`batch import returned ${response.status}: ${responseText.slice(0, 500)}`);

const result = JSON.parse(responseText) as { runId?: string; duplicate?: boolean; observations?: number; candidates?: number };
process.stdout.write(JSON.stringify({
  ok: true,
  runId: result.runId ?? null,
  duplicate: Boolean(result.duplicate),
  observations: result.observations ?? 0,
  candidates: result.candidates ?? 0,
}, null, 2));
