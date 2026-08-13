import { describe, expect, test } from "bun:test";
import type { CandidateDraft } from "../src/domain";
import { atomicBatch } from "~/infrastructure/db/transaction";
import { createCandidate } from "~/repositories/candidates/write";
import { TestD1 } from "./support/d1-adapter";

describe("D1 atomic writes", () => {
  test("rolls back the complete write set when a later statement fails", async () => {
    const database = new TestD1();
    database.exec("CREATE TABLE entries (id TEXT PRIMARY KEY, label TEXT NOT NULL)");

    await expect(atomicBatch(database.binding(), [
      database.binding().prepare("INSERT INTO entries (id, label) VALUES (?, ?)").bind("one", "first"),
      database.binding().prepare("INSERT INTO entries (id, label) VALUES (?, ?)").bind("one", "duplicate"),
    ])).rejects.toThrow();

    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM entries").get()).toEqual({ count: 0 });
    database.close();
  });

  test("rejects an empty transaction boundary", () => {
    const database = new TestD1();
    expect(() => atomicBatch(database.binding(), [])).toThrow("at least one statement");
    database.close();
  });

  test("does not leave candidate media behind when candidate creation fails", async () => {
    const database = new TestD1();
    for (const path of [...new Bun.Glob("migrations/*.sql").scanSync()].sort()) {
      database.exec(await Bun.file(path).text());
    }
    const invalidDraft: CandidateDraft = {
      contentClass: "official_news",
      sourceIdentity: "official",
      title: "invalid candidate",
      summary: "must roll back",
      url: "https://example.test/candidate",
      sourceName: "test",
      publishedAt: "2026-08-11T00:00:00Z",
      media: {
        contentClass: "official_art",
        title: "temporary media",
        creatorName: "test",
        originalUrl: "https://example.test/media",
      },
    };
    Reflect.set(invalidDraft, "contentClass", "invalid-class");

    await expect(createCandidate(database.binding(), invalidDraft)).rejects.toThrow();
    expect(database.sqlite.query(
      "SELECT COUNT(*) AS count FROM media_items WHERE original_url = ?",
    ).get(invalidDraft.media!.originalUrl)).toEqual({ count: 0 });
    database.close();
  });
});
