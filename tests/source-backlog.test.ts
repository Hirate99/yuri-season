import { describe, expect, test } from "bun:test";
import {
  mergeSourceBacklog,
  resolveSourceBacklog,
  sourceChangeId,
} from "../scripts/lib/source-backlog";
import type { SourceChange } from "../scripts/lib/source-change";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function change(sourceId: string, version: string): SourceChange {
  return {
    kind: "feed_candidate",
    sourceId,
    sourceType: "official_page",
    animeTitle: "作品",
    sourceLabel: "NEWS",
    trustLevel: "official",
    item: {
      sourceItemId: "news1",
      canonicalUrl: `https://example.com/${sourceId}/news1`,
      title: version,
      excerpt: version,
      publicText: version,
      authorName: null,
      publishedAt: null,
      contentHash: version,
      contentType: "text/html",
      language: "ja",
      metadata: {},
    },
  };
}

describe("source backlog", () => {
  test("legacy migration and interrupted migration can resolve one version without network access", async () => {
    for (const schemaVersion of [2, 3]) {
      const cwd = await mkdtemp(join(tmpdir(), "yuri-source-test-"));
      try {
        const directory = join(cwd, ".research-cache");
        await mkdir(directory);
        const old = change("nanoha", "v1");
        const updated = change("nanoha", "v2");
        const proposed = {
          version: 3,
          sources: { nanoha: { hashes: ["v2"], etag: null, lastModified: null } },
        };
        await Bun.write(
          join(directory, "source-state.json"),
          JSON.stringify({ version: 3, sources: {} }),
        );
        await Bun.write(join(directory, "proposed-state.json"), JSON.stringify(proposed));
        await Bun.write(
          join(directory, "pending-diff.json"),
          JSON.stringify({
            schemaVersion,
            createdAt: "2026-09-15T02:00:00Z",
            catalogChanges: [],
            feedChanges: [old, updated],
            errors: [],
          }),
        );
        const input = join(cwd, "resolutions.json");
        await Bun.write(
          input,
          JSON.stringify({
            resolutions: [
              {
                changeId: sourceChangeId(old),
                outcome: "ignored",
                reason: "superseded; newer version remains pending",
              },
            ],
          }),
        );
        const child = Bun.spawn(
          [Bun.which("bun")!, resolve("scripts/source-diff.ts"), "commit", input],
          { cwd, stdout: "pipe", stderr: "pipe" },
        );
        const [exitCode, stdout, stderr] = await Promise.all([
          child.exited,
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
        ]);
        expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: "" });
        const result = JSON.parse(stdout);
        const pending = await Bun.file(join(directory, "pending-diff.json")).json();
        expect(pending.feedChanges.map((item: SourceChange) => item.item.contentHash)).toEqual([
          "v2",
        ]);
        expect(await Bun.file(join(directory, "source-state.json")).json()).toEqual(proposed);
        expect(await Bun.file(join(directory, "proposed-state.json")).exists()).toBe(false);
        const archived = await Bun.file(join(cwd, result.archive)).json();
        expect(archived.changes.map((item: SourceChange) => item.item.contentHash)).toEqual(["v1"]);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    }
  });
  test("retains a legacy blocked item alongside its newer version and another source", () => {
    const old = change("nanoha", "v1");
    const updated = change("nanoha", "v2");
    const lara = change("lara", "v1");
    const legacy = {
      schemaVersion: 2,
      createdAt: "2026-09-11T10:00:00Z",
      catalogChanges: [],
      feedChanges: [old],
      errors: [],
    };
    const backlog = mergeSourceBacklog(
      legacy,
      [old, updated, lara],
      [],
      ["nanoha", "lara"],
      "2026-09-15T10:00:00Z",
    );
    expect(backlog.feedChanges).toHaveLength(3);
    expect(backlog.schemaVersion).toBe(3);
    const resolved = resolveSourceBacklog(backlog, [
      {
        changeId: sourceChangeId(old),
        outcome: "covered",
        reason: "old version already publicly covered",
        evidenceUrls: ["https://example.com/updates/1"],
      },
    ]);
    expect(resolved.feedChanges.map((item) => item.item.contentHash)).toEqual(["v2", "v1"]);
    expect(resolved.feedChanges.map((item) => item.sourceId)).toEqual(["nanoha", "lara"]);
  });

  test("a repeated fetch after a crash neither duplicates nor forgets pending content", () => {
    const original = change("nanoha", "v1");
    const first = mergeSourceBacklog(null, [original], [], ["nanoha"], "2026-09-15T10:00:00Z");
    const replay = mergeSourceBacklog(first, [original], [], ["nanoha"], "2026-09-15T11:00:00Z");
    expect(replay).toEqual(first);
    expect(
      mergeSourceBacklog(first, [], [], ["nanoha"], "2026-09-15T11:00:00Z").feedChanges,
    ).toEqual(first.feedChanges);
  });

  test("keeps unvisited source failures and clears only recovered sources", () => {
    const first = mergeSourceBacklog(
      null,
      [],
      [
        { sourceId: "a", message: "timeout" },
        { sourceId: "b", message: "timeout" },
      ],
      ["a", "b"],
      "2026-09-15T10:00:00Z",
    );
    expect(mergeSourceBacklog(first, [], [], ["a"], "2026-09-15T11:00:00Z").errors).toEqual([
      { sourceId: "b", message: "timeout" },
    ]);
  });

  test("rejects broad clearing, stale identity and unsupported completion claims", () => {
    const item = change("nanoha", "v1");
    const pending = mergeSourceBacklog(null, [item], [], ["nanoha"], "2026-09-15T10:00:00Z");
    expect(() => resolveSourceBacklog(pending, [])).toThrow();
    expect(() =>
      resolveSourceBacklog(pending, [
        { changeId: "unknown", outcome: "ignored", reason: "duplicate" },
      ]),
    ).toThrow();
    expect(() =>
      resolveSourceBacklog(pending, [
        { changeId: sourceChangeId(item), outcome: "published", reason: "done" },
      ]),
    ).toThrow();
    expect(pending.feedChanges).toHaveLength(1);
  });
});
