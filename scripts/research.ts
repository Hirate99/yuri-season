import { Command } from "commander";
import { recordRoutine, routineContext } from "./lib/routine";

export function createResearchCommand() {
  const program = new Command()
    .name("research")
    .description("百合季编辑研究：读取上下文、检查官网、记录核验结果")
    .showHelpAfterError()
    .addHelpText(
      "after",
      "\n专题审计和旧 campaign 恢复使用 scripts/full-discovery.ts 与 scripts/discovery-campaign.ts。",
    );

  program
    .command("context", { isDefault: true })
    .description("读取来源、检查记录和未完成线索（默认命令）")
    .option("--details", "包含历史线索的完整原文、媒体元数据和旧恢复游标")
    .action(async (options: { details?: boolean }) => {
      console.log(JSON.stringify(await routineContext(options), null, 2));
    });

  program
    .command("record <observations.json>")
    .description("保存并同步已核验的来源证据")
    .addHelpText(
      "after",
      "\n输入格式与示例：.agent/skills/yuri-season-research/references/discovery-results.md#routine-observations",
    )
    .action(async (path: string) => {
      console.log(JSON.stringify(await recordRoutine(path), null, 2));
    });

  program
    .command("sources")
    .description("检查登记官网的内容变化")
    .action(async () => {
      process.exitCode = await Bun.spawn(
        [process.execPath, "scripts/source-diff.ts", "check", "--profile=routine"],
        { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
      ).exited;
    });

  return program;
}

if (import.meta.main) await createResearchCommand().parseAsync();
