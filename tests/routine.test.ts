import { expect, test } from "bun:test";
import { mkdtemp, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DiscoveryContext } from "../scripts/lib/discovery-context";
import {
  recordRoutine,
  routineRecords,
  routineSources,
  type RoutineObservation,
} from "../scripts/lib/routine";
import { stableFingerprint } from "~/shared/fingerprint";

const searchedAt = "2026-09-16T03:00:00Z";
const context = {
  dashboard: {
    seasons: [{ id: "season-1", label: "2026 夏", isCurrent: true }],
    anime: [{ id: "anime-1", titleZh: "作品", titleJa: "作品", seasonId: "season-1" }],
  },
  resources: {
    "anime-1": {
      accounts: [
        {
          id: "account-1",
          verified: true,
          monitorMode: "local",
          ownerType: "anime",
          ownerId: "anime-1",
          platform: "X",
          handle: "official",
          url: "https://x.com/official",
        },
      ],
      sources: [],
      staff: [],
      cast: [],
      broadcasts: [],
      events: [],
      media: [],
      discussions: [],
      themeSongs: [],
    },
  },
  memory: [
    {
      id: "memory-1",
      scopeType: "anime",
      scopeId: "anime-1",
      searchKind: "social",
      targetKey: "updates:anime-1:account-1",
      searchedAt,
      nextSearchAt: "2026-09-17T03:00:00Z",
      status: "active",
      cursor: { committedPostId: "100" },
    },
  ],
  memoryHits: [],
} as unknown as DiscoveryContext;

function observation(): RoutineObservation {
  return {
    sourceId: "anime:anime-1:social:updates:anime-1:account-1",
    previousPostId: "100",
    searchedAt: "2026-09-16T04:00:00Z",
    outcome: "complete",
    surface: "signed_in_timeline",
    coverage: { reachedPreviousCursor: true, originalPostsInspected: 1, newestPostId: "110" },
    hits: [
      {
        canonicalUrl: "https://x.com/official/status/110",
        title: "公告",
        contentHash: null,
        outcome: "ignored",
        metadata: { platformObjectId: "110", reason: "已核对：重复公告，资源无变化" },
      },
    ],
  };
}

test("all sources stay visible; fixed three hours overrides legacy next-search dates", () => {
  const recent = routineSources(context, new Date("2026-09-16T05:59:59Z"));
  expect(recent).toHaveLength(1);
  expect(recent[0].needsCheck).toBe(false);
  expect(recent[0].query.cursor.committedPostId).toBe("100");
  expect(routineSources(context, new Date("2026-09-16T06:00:00Z"))[0].needsCheck).toBe(true);
});

test("partial and blocked coverage stays actionable within three hours", () => {
  for (const patch of [
    { status: "blocked" },
    { cursor: { committedPostId: "100", resume: { page: 2 } } },
    { cursor: { committedPostId: "100", lastPartialAt: searchedAt } },
  ]) {
    const data = { ...context, memory: [{ ...context.memory[0], ...patch }] } as DiscoveryContext;
    expect(routineSources(data, new Date("2026-09-16T03:01:00Z"))[0].needsCheck).toBe(true);
  }
});

test("keeps routine coverage in the current season without hiding recent sources", () => {
  const data = structuredClone(context);
  data.dashboard.anime[0].seasonId = "other-season";
  expect(routineSources(data)).toHaveLength(0);
});

test("records an early inspection without campaign or lease and computes three hours", async () => {
  const [record] = await routineRecords(context, [observation()]);
  expect(record.nextSearchAt).toBe("2026-09-16T07:00:00.000Z");
  expect(record.cursor).toMatchObject({ committedPostId: "110", resume: null });
  expect(record.hits).toHaveLength(1);
});

test("partial and blocked observations preserve the committed cursor without deferral", async () => {
  for (const outcome of ["partial", "blocked"] as const) {
    const [record] = await routineRecords(context, [
      {
        ...observation(),
        outcome,
        coverage: {
          reachedPreviousCursor: false,
          originalPostsInspected: 1,
          newestPostId: "110",
          resumeCursor: { lastPostId: "105" },
        },
      },
    ]);
    expect(record.cursor?.committedPostId).toBe("100");
    expect(record.nextSearchAt).toBe("2026-09-16T04:00:00.000Z");
    if (outcome === "partial") expect(record.cursor?.resume).toEqual({ lastPostId: "105" });
  }
});

test("retains boundary, original evidence and stale cursor validation", async () => {
  const valid = observation();
  for (const invalid of [
    { ...valid, previousPostId: "99" },
    { ...valid, surface: "search_engine" as const },
    { ...valid, coverage: { ...valid.coverage!, reachedPreviousCursor: false } },
    { ...valid, hits: [] },
    { ...valid, hits: [...valid.hits, ...valid.hits] },
    { ...valid, coverage: { ...valid.coverage!, newestPostId: "90" } },
  ])
    await expect(routineRecords(context, [invalid])).rejects.toThrow();
});

test("failed sync preserves evidence and replay uses original timestamps without new context", async () => {
  const directory = await mkdtemp(join(tmpdir(), "yuri-routine-"));
  const observations = [{ ...observation(), notes: crypto.randomUUID() }];
  const archive = `.research-cache/discovery-results/routine-${await stableFingerprint(JSON.stringify(observations))}.json`;
  const input = join(directory, "observations.json");
  try {
    await Bun.write(input, JSON.stringify({ observations }));
    await expect(
      recordRoutine(
        input,
        async () => context,
        async () => {
          throw new Error("network unavailable");
        },
      ),
    ).rejects.toThrow("network unavailable");
    const saved = await Bun.file(archive).json();
    expect(saved.syncedAt).toBeNull();
    expect(saved.records[0].searchedAt).toBe("2026-09-16T04:00:00.000Z");
    let calls = 0;
    const noContext = async (): Promise<DiscoveryContext> => {
      throw new Error("must reuse evidence");
    };
    await recordRoutine(archive, noContext, async (records) => {
      calls++;
      expect(records).toEqual(saved.records);
      return { records: records.length, hits: 1 };
    });
    await recordRoutine(input, noContext, async () => {
      throw new Error("already synchronized");
    });
    expect(calls).toBe(1);
    expect((await Bun.file(archive).json()).syncedAt).toBeString();
  } finally {
    await rm(input, { force: true });
    await rm(archive, { force: true });
    await rmdir(directory);
  }
});
