import { expect, test } from "bun:test";
import { createResearchCommand } from "../scripts/research";

function cli() {
  const calls: { command: string; path?: string }[] = [];
  let output = "";
  const program = createResearchCommand()
    .exitOverride()
    .configureOutput({
      writeOut: (text) => {
        output += text;
      },
      writeErr: (text) => {
        output += text;
      },
    });
  for (const command of program.commands) {
    command.exitOverride().configureOutput({
      writeOut: (text) => {
        output += text;
      },
      writeErr: (text) => {
        output += text;
      },
    });
    command.action((path?: string) => {
      calls.push({ command: command.name(), path: command.name() === "record" ? path : undefined });
    });
  }
  return { program, calls, output: () => output };
}

test("routes the default and explicit commands, preserving a spaced file path", async () => {
  for (const args of [
    [],
    ["context"],
    ["sources"],
    ["record", "C:/Research Notes/observations.json"],
  ]) {
    const { program, calls } = cli();
    await program.parseAsync(args, { from: "user" });
    expect(calls).toEqual([
      { command: args[0] ?? "context", path: args[0] === "record" ? args[1] : undefined },
    ]);
  }
});

test("rejects malformed commands before running any action", async () => {
  for (const args of [
    ["record"],
    ["record", "--profile=routine"],
    ["context", "extra"],
    ["record", "one.json", "two.json"],
    ["context", "--unknown"],
    ["finish"],
  ]) {
    const { program, calls } = cli();
    await expect(program.parseAsync(args, { from: "user" })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  }
});

test("context accepts optional full evidence without changing other commands", async () => {
  const { program, calls } = cli();
  await program.parseAsync(["context", "--details"], { from: "user" });
  expect(program.commands.find((command) => command.name() === "context")?.opts()).toEqual({
    details: true,
  });
  expect(calls).toEqual([{ command: "context", path: undefined }]);
  const other = cli();
  await expect(
    other.program.parseAsync(["sources", "--details"], { from: "user" }),
  ).rejects.toThrow();
  expect(other.calls).toHaveLength(0);
});

test("help describes commands and required arguments without executing research", async () => {
  for (const args of [["--help"], ["record", "--help"]]) {
    const { program, calls, output } = cli();
    await expect(program.parseAsync(args, { from: "user" })).rejects.toMatchObject({
      code: "commander.helpDisplayed",
      exitCode: 0,
    });
    expect(output()).toContain("observations.json");
    expect(calls).toHaveLength(0);
  }
});
