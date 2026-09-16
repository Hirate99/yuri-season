import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const entry = pathToFileURL(resolve("scripts/research.ts")).href;

async function simulateCycle(options: { sourceCode?: number; active?: boolean }) {
  const cwd = await mkdtemp(join(tmpdir(), "yuri-cycle-test-"));
  try {
    await mkdir(join(cwd, ".research-cache"));
    await Bun.write(
      join(cwd, ".research-cache/pending-diff.json"),
      JSON.stringify({ schemaVersion: 2, feedChanges: [{ sourceId: "nanoha" }] }),
    );
    if (options.active)
      await Bun.write(
        join(cwd, ".research-cache/update-plan.json"),
        JSON.stringify({
          schemaVersion: 3,
          profile: "routine",
          campaignId: "test",
          createdAt: "2026-09-15T02:00:00Z",
          updatedAt: "2026-09-15T02:00:00Z",
          season: { label: "summer" },
          queries: [{ id: "x", state: "pending" }],
        }),
      );
    const code = `import { cycle } from ${JSON.stringify(entry)}; const calls=[]; await cycle(['--profile=routine'],async (script,args)=>{calls.push({script,args}); return script.includes('source-diff') ? ${options.sourceCode ?? 0} : 0;}); console.log('CALLS:'+JSON.stringify(calls));`;
    const process = Bun.spawn([Bun.which("bun")!, "--eval", code], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited,
    ]);
    const calls = JSON.parse(stdout.slice(stdout.indexOf("CALLS:") + 6)) as Array<{
      script: string;
      args: string[];
    }>;
    return { calls, stderr, exitCode };
  } finally {
    // cwd is the exact temporary directory returned above, never the repository.
    await rm(cwd, { recursive: true, force: true });
  }
}

test("pending website content does not prevent timeline planning", async () => {
  const result = await simulateCycle({});
  expect(result.exitCode).toBe(0);
  expect(result.calls.map((call) => call.script)).toEqual([
    "scripts/source-diff.ts",
    "scripts/full-discovery.ts",
  ]);
});

test("failed website detection is reported while timeline planning still runs", async () => {
  const result = await simulateCycle({ sourceCode: 1 });
  expect(result.exitCode).toBe(1);
  expect(result.calls.map((call) => call.script)).toEqual([
    "scripts/source-diff.ts",
    "scripts/full-discovery.ts",
  ]);
});

test("an unfinished timeline campaign no longer suppresses website checks", async () => {
  const result = await simulateCycle({ active: true });
  expect(result.exitCode).toBe(0);
  expect(result.calls.map((call) => call.script)).toEqual(["scripts/source-diff.ts"]);
});
