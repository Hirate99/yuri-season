import { describe, expect, test } from "bun:test";

describe("backend architecture boundaries", () => {
  test("keeps SQL out of HTTP route modules", async () => {
    const routeFiles = [
      "src/server/api.ts",
      "src/server/api-admin-routes.ts",
      "src/server/api-public-routes.ts",
      "src/server/api-research-routes.ts",
      "src/server/api-shared.ts",
    ];
    for (const path of routeFiles) {
      const source = await Bun.file(path).text();
      expect(source).not.toMatch(/\.prepare\s*\(/);
      expect(source).not.toMatch(/\bsql\s*`/);
      expect(source).not.toContain("D1Database");
    }
  });

  test("keeps the shared anime read model in Drizzle instead of a SQL select constant", async () => {
    const source = await Bun.file("worker/db/read-models/anime.ts").text();
    expect(source).toContain("getTableColumns(animeTable)");
    expect(source).not.toContain("ANIME_SELECT");
  });
});
