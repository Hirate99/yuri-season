import { expect, test } from "bun:test";

test("keeps top-level research scripts limited to maintained package entry points", async () => {
  const packageJson = (await Bun.file("package.json").json()) as {
    scripts: Record<string, string>;
  };
  const maintained = new Set(
    Object.values(packageJson.scripts).flatMap((command) =>
      [...command.matchAll(/scripts\/([^\s"']+\.ts)/gu)].map((match) => `scripts/${match[1]}`),
    ),
  );
  const topLevel = [...new Bun.Glob("scripts/*.ts").scanSync()].map((path) =>
    path.replaceAll("\\", "/"),
  );
  expect(topLevel.sort()).toEqual([...maintained].sort());
});
