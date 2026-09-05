import { afterEach, beforeEach, expect, test } from "bun:test";
import { api } from "~/http/api";
import { readAdminDashboard } from "~/application/admin/service";
import { coverageChecks } from "@/domain/coverage";
import { TestD1 } from "./support/d1-adapter";

let db: TestD1;
beforeEach(async () => {
  db = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) db.exec(await Bun.file(path).text());
});
afterEach(() => db.close());
const get = async (path: string): Promise<Response> => api.request(`https://example.test/api/admin/${path}`, {
  headers: { authorization: "Bearer test-admin" },
}, { DB: db.binding(), ADMIN_TOKEN: "test-admin" } as Env);

test("page endpoints retain dashboard data without unrelated reads or empty fields", async () => {
  const all = await readAdminDashboard(db.binding());
  db.resetMetrics();
  const response = await get("works");
  expect(response.status).toBe(200);
  expect<unknown>(await response.json()).toEqual(all.anime);
  expect(db.statements.join("\n")).not.toMatch(/feed_candidates|audit_log|update_jobs|research_runs/);
  expect(db.executedStatements).toBeLessThanOrEqual(2);
  expect<unknown>(await (await get("summary")).json()).toEqual({ counts: all.counts, seasons: all.seasons });
  expect<unknown>(await (await get("review")).json()).toEqual({ heldCandidates: all.heldCandidates, recentPublications: all.recentPublications });
  expect<unknown>(await (await get("automation")).json()).toEqual({ sources: all.sources, recentRuns: all.recentRuns, recentJobs: all.recentJobs, recentAudit: all.recentAudit });
  expect<unknown>(await (await get("coverage")).json()).toEqual(all.coverage);
  expect<unknown>(await (await get("overview")).json()).toEqual({ sources: all.sources, recentRuns: all.recentRuns, recentJobs: all.recentJobs, coverage: all.coverage });
});

test("overview completeness requires the same character evidence as the coverage checklist", async () => {
  const { coverage } = await readAdminDashboard(db.binding());
  const item = { ...coverage[0], hasCover: true, broadcasts: 1, staff: 1, mainCharacters: 2,
    mainCharacterExpected: 2, sourcedMainCharacters: 2, namedMainCharacters: 2, auditedMainBirthdays: 2,
    verifiedAccounts: 1, sources: 1, themeSongs: 1, themeSongCovers: 1, verifiedEvents: 1, discussions: 1, media: 1 };
  expect(coverageChecks(item).every(check => check.ready)).toBe(true);
  expect(coverageChecks({ ...item, mainCharacters: 1 }).filter(check => !check.ready).map(check => check.label))
    .toContain("主角团");
  expect(coverageChecks({ ...item, namedMainCharacters: 0 }).filter(check => !check.ready).map(check => check.label))
    .toEqual(["中文名来源"]);
  expect(coverageChecks({ ...item, auditedMainBirthdays: 0 }).filter(check => !check.ready).map(check => check.label))
    .toEqual(["生日核验"]);
});
