import { describe, expect, test } from "bun:test";

describe("backend architecture boundaries", () => {
  test("keeps SQL out of HTTP route modules", async () => {
    const routeFiles = [
      "backend/http/api.ts",
      "backend/http/shared.ts",
      ...new Bun.Glob("backend/http/routes/**/*.ts").scanSync(),
    ];
    for (const path of routeFiles) {
      const source = await Bun.file(path).text();
      expect(source).not.toMatch(/\.prepare\s*\(/);
      expect(source).not.toMatch(/\bsql\s*`/);
      expect(source).not.toContain("D1Database");
      expect(source).not.toContain("env.DB");
      expect(source).not.toContain("~/repositories/");
    }
  });

  test("keeps new migration prefixes unique after the historical 0027 collision", () => {
    const prefixes = [...new Bun.Glob("migrations/*.sql").scanSync()]
      .map((path) => path.replaceAll("\\", "/").split("/").at(-1)!.split("_")[0]);
    const duplicates = [...new Set(prefixes.filter((prefix, index) => prefixes.indexOf(prefix) !== index))];
    expect(duplicates).toEqual(["0027"]);
  });

  test("keeps native D1 prepare calls inside the explicit whitelist", async () => {
    const files = [...new Bun.Glob("backend/**/*.ts").scanSync()];
    const prepareFiles: string[] = [];
    const nativeStatementFiles: string[] = [];
    const nativeHelperImports: string[] = [];
    for (const path of files) {
      const source = await Bun.file(path).text();
      const matches = source.match(/\.prepare\s*\(/g) ?? [];
      if (matches.length > 0) prepareFiles.push(path.replaceAll("\\", "/"));
      if (source.includes("nativeStatement(") && !path.replaceAll("\\", "/").includes("/native/")) {
        nativeStatementFiles.push(path.replaceAll("\\", "/"));
      }
      if (/infrastructure\/db\/native\/statement|native\/statement/.test(source)
        && !path.replaceAll("\\", "/").includes("/native/")) {
        nativeHelperImports.push(path.replaceAll("\\", "/"));
      }
    }
    expect(prepareFiles).toEqual(["backend/infrastructure/db/native/statement.ts"]);
    expect(nativeStatementFiles).toEqual([]);
    expect(nativeHelperImports).toEqual([]);
  });

  test("defines every persisted business table in the Drizzle schema", async () => {
    const migrationTables = new Set<string>();
    for (const path of new Bun.Glob("migrations/*.sql").scanSync()) {
      const source = await Bun.file(path).text();
      for (const match of source.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([A-Za-z0-9_]+)/gi)) {
        if (!match[1].endsWith("_new")) migrationTables.add(match[1]);
      }
    }
    const schemaTables = new Set<string>();
    for (const path of new Bun.Glob("backend/infrastructure/db/schema/*.ts").scanSync()) {
      const source = await Bun.file(path).text();
      for (const match of source.matchAll(/sqliteTable\("([^"]+)"/g)) schemaTables.add(match[1]);
    }
    expect([...schemaTables].sort()).toEqual([...migrationTables].sort());
  });

  test("keeps application orchestration out of repositories", async () => {
    for (const path of new Bun.Glob("backend/repositories/**/*.ts").scanSync()) {
      expect(await Bun.file(path).text()).not.toContain("~/application/");
    }
  });

  test("keeps HTTP parsing dependencies out of business and persistence layers", async () => {
    for (const root of ["backend/application", "backend/repositories", "backend/research", "backend/infrastructure"]) {
      for (const path of new Bun.Glob(`${root}/**/*.ts`).scanSync()) {
        expect(await Bun.file(path).text()).not.toContain("~/http/");
      }
    }
  });
});
