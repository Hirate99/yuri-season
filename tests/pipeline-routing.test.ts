import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { syncSourceJob } from "../worker/research/pipeline";
import type { UpdateJobRow } from "../worker/research/types";
import { TestD1 } from "./support/d1-adapter";

let database: TestD1;

beforeEach(async () => {
  database = new TestD1();
  for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
    database.exec(await Bun.file(path).text());
  }
});

afterEach(() => database.close());

describe("worker source routing", () => {
  test("stores catalog observations without touching Workers AI or Feed", async () => {
    database.sqlite.query(`
      INSERT INTO source_observations (
        id, source_id, anime_id, canonical_url, content_hash
      ) VALUES ('baseline', 'source-kimi-bgm', 'anime-kimishinu',
        'https://api.bgm.tv/v0/subjects/541285', 'old-hash')
    `).run();

    let aiAccessed = false;
    const env = {
      DB: database.binding(),
      get AI(): Ai {
        aiAccessed = true;
        throw new Error("catalog metadata must not access Workers AI");
      },
    } as Env;
    const job: UpdateJobRow = {
      id: "job-catalog-routing",
      job_type: "sync_source",
      scope_type: "source",
      scope_id: "source-kimi-bgm",
      priority: 50,
      attempt_count: 1,
      max_attempts: 4,
      input_json: "{}",
    };

    const result = await syncSourceJob(env, job, async () => Response.json({
      id: 541285,
      name: "きみが死ぬまで恋をしたい",
      name_cn: "与你相恋到生命尽头",
      summary: "更新后的条目简介",
    }));

    expect(result).toEqual({
      counters: { sources: 1, observations: 1, candidates: 0, published: 0, held: 0, rejected: 0 },
      partial: false,
    });
    expect(aiAccessed).toBe(false);
    const counts = database.sqlite.query(`
      SELECT
        (SELECT COUNT(*) FROM source_observations WHERE source_id = 'source-kimi-bgm') AS observations,
        (SELECT COUNT(*) FROM claims) AS claims,
        (SELECT COUNT(*) FROM feed_candidates) AS candidates
    `).get();
    expect(counts).toEqual({ observations: 2, claims: 0, candidates: 0 });
  });
});
