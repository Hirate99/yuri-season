import { describe, expect, test } from "bun:test";
import { TestD1 } from "./support/d1-adapter";

describe("discussion publication migration", () => {
  test("links legacy discussions and withdraws non-published candidate projections", async () => {
    const database = new TestD1();
    try {
      const paths = [...new Bun.Glob("migrations/*.sql").scanSync()].sort();
      for (const path of paths.filter((path) => !path.endsWith("0031_discussion_publication_links.sql"))) {
        database.exec(await Bun.file(path).text());
      }

      database.exec(`
        INSERT INTO feed_candidates (
          id, anime_id, content_class, source_identity, title, summary, url,
          source_name, published_at, status, fingerprint
        ) VALUES (
          'candidate-legacy-rejected', 'anime-kimishinu', 'community_thread',
          'community', '旧集中讨论', '旧摘要', 'https://bbs.example.test/legacy',
          '百合会', '2026-04-09T22:01:00+09:00', 'rejected', 'legacy-rejected'
        );
        INSERT INTO discussions (
          id, anime_id, platform, title, url, note, is_active
        ) VALUES (
          'discussion-legacy-rejected', 'anime-kimishinu', '百合会', '旧集中讨论',
          'https://bbs.example.test/legacy', NULL, 1
        );
        INSERT INTO discussion_anime (discussion_id, anime_id)
        VALUES ('discussion-legacy-rejected', 'anime-kimishinu');
        INSERT INTO feed_items (
          id, candidate_id, anime_id, content_class, source_identity, title,
          summary, url, source_name, published_at
        ) VALUES (
          'feed-legacy-rejected', 'candidate-legacy-rejected', 'anime-kimishinu',
          'community_thread', 'community', '旧集中讨论', '旧摘要',
          'https://bbs.example.test/legacy', '百合会', '2026-04-09T22:01:00+09:00'
        );
      `);

      database.exec(await Bun.file("migrations/0031_discussion_publication_links.sql").text());

      expect(database.sqlite.query(`
        SELECT discussion_id, withdrawn_at IS NOT NULL AS withdrawn
        FROM feed_items WHERE id = 'feed-legacy-rejected'
      `).get()).toEqual({ discussion_id: "discussion-legacy-rejected", withdrawn: 1 });
      expect(database.sqlite.query(`
        SELECT correction_type, actor_type FROM corrections
        WHERE feed_item_id = 'feed-legacy-rejected'
      `).get()).toEqual({ correction_type: "withdraw", actor_type: "system" });
    } finally {
      database.close();
    }
  });
});
