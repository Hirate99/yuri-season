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

  test("keeps the shared anime read model in Drizzle instead of a SQL select constant", async () => {
    const source = await Bun.file("backend/infrastructure/db/read-models/anime.ts").text();
    expect(source).toContain("getTableColumns(animeTable)");
    expect(source).not.toContain("ANIME_SELECT");
  });

  test("keeps Admin resource reads in typed Drizzle queries", async () => {
    const source = await Bun.file("backend/repositories/admin/resources.ts").text();
    expect(source).toContain("database(db)");
    expect(source).not.toMatch(/\.prepare\s*\(/);
  });

  test("uses the dedicated backend root alias", async () => {
    const files = [
      ...new Bun.Glob("backend/**/*.ts").scanSync(),
      ...new Bun.Glob("src/**/*.ts").scanSync(),
      ...new Bun.Glob("src/**/*.tsx").scanSync(),
    ];
    for (const path of files) {
      expect(await Bun.file(path).text()).not.toContain("@worker/");
    }
  });

  test("keeps public cache invalidation explicit at mutation handlers", async () => {
    const apiSource = await Bun.file("backend/http/api.ts").text();
    const adminRoutes = await Promise.all(
      [...new Bun.Glob("backend/http/routes/admin/**/*.ts").scanSync()].map((path) => Bun.file(path).text()),
    );
    const researchRoutes = await Promise.all(
      [...new Bun.Glob("backend/http/routes/research/**/*.ts").scanSync()].map((path) => Bun.file(path).text()),
    );

    expect(apiSource).not.toContain("shouldInvalidatePublicCache");
    expect(adminRoutes.join("\n")).toContain("invalidatePublicData(context)");
    expect(researchRoutes.join("\n")).toContain("invalidatePublicData(context)");
    expect(adminRoutes.join("\n")).toContain("await invalidatePublicData(context)");
    expect(researchRoutes.join("\n")).toContain("await invalidatePublicData(context)");
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
    let count = 0;
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
      count += matches.length;
    }
    expect(prepareFiles).toEqual(["backend/infrastructure/db/native/statement.ts"]);
    expect(nativeStatementFiles).toEqual([]);
    expect(nativeHelperImports).toEqual([]);
    expect(count).toBeLessThanOrEqual(20);
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
    expect(await Bun.file("backend/repositories/admin-resource-mutations.ts").exists()).toBe(false);
    expect(await Bun.file("backend/repositories/mutations.ts").exists()).toBe(false);
    expect(await Bun.file("backend/repositories/admin/dashboard.ts").text()).not.toContain("readAdminCoverage");
    expect(await Bun.file("backend/repositories/detail.ts").text()).not.toContain("readFeed");
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

  test("keeps batch orchestration small and exports a Hono RPC contract", async () => {
    const batch = await Bun.file("backend/research/batch.ts").text();
    const api = await Bun.file("backend/http/api.ts").text();
    expect(batch.split(/\r?\n/).length).toBeLessThan(201);
    expect(api).toContain("export type ApiType = typeof api");
  });

  test("groups route capabilities under their shared URL prefixes", async () => {
    for (const prefix of ["admin", "public", "research"]) {
      expect(await Bun.file(`backend/http/routes/${prefix}.ts`).exists()).toBe(false);
      expect(await Bun.file(`backend/http/routes/${prefix}/index.ts`).exists()).toBe(true);
    }
  });

  test("uses the Hono RPC contract instead of duplicating client API paths", async () => {
    const client = await Bun.file("src/lib/rpc.ts").text();
    expect(client).toContain("hc<ApiType>");
    expect(client).not.toContain("apiRequest");
    for (const path of [
      ...new Bun.Glob("src/**/*.ts").scanSync(),
      ...new Bun.Glob("src/**/*.tsx").scanSync(),
      ...new Bun.Glob("scripts/**/*.ts").scanSync(),
    ]) {
      if (path.replaceAll("\\", "/") === "src/server.ts") continue;
      expect(await Bun.file(path).text()).not.toMatch(/["'`]\/api\//);
    }
  });

  test("does not contain known mojibake sequences", async () => {
    for (const path of new Bun.Glob("backend/**/*.ts").scanSync()) {
      expect(await Bun.file(path).text()).not.toMatch(/灏|銆|鈥|锟|鐨|鑷|鍔ㄧ敾|�/u);
    }
  });
});
