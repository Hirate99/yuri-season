import { describe, expect, test } from "bun:test";

const skillPath = ".agent/skills/yuri-season-research/SKILL.md";
const policyPath = ".agent/skills/yuri-season-research/references/research-policy.md";
const resultsPath = ".agent/skills/yuri-season-research/references/discovery-results.md";
const updatePath = ".agent/skills/yuri-season-research/references/update-policy.md";
const publicationPath = ".agent/skills/yuri-season-research/references/publication-policy.md";

describe("research skill policy", () => {
  test("keeps the skill concise and routes detailed policy progressively", async () => {
    const content = await Bun.file(skillPath).text();
    expect(content.split("\n").length).toBeLessThan(100);
    expect(content).toContain("Read only what the task needs");
    expect(content).toContain("references/research-policy.md");
    expect(content).toContain("references/update-policy.md");
    expect(content).toContain("references/publication-policy.md");
    expect(content).toContain("references/discovery-results.md");
    expect(content).toContain("references/batch-schema.md");
    expect(content).toContain("Operate like a strong human editor");
    expect(content).toContain("bun run research -- cycle");
    expect(content).toContain("bun run research -- next");
    expect(content).toContain("bun run research -- submit");
    expect(content).toContain("bun run research -- finish");
    expect(content).toContain("`routine`: default");
    expect(content).toContain("`account-discovery`: explicit and scoped");
    expect(content).toContain("Do not infer `discovery`, `social-audit`, or `account-discovery`");
    expect(content).toContain("One-off audits, repair builders, data extracts, candidate inspectors, and batch generators");
    expect(content).toContain("Do not add or commit a top-level `scripts/*.ts` file");
  });

  test("keeps top-level research scripts limited to maintained package entry points", async () => {
    const packageJson = await Bun.file("package.json").json() as { scripts: Record<string, string> };
    const maintained = new Set(Object.values(packageJson.scripts).flatMap((command) =>
      [...command.matchAll(/scripts\/([^\s"']+\.ts)/gu)].map((match) => `scripts/${match[1]}`)
    ));
    const topLevel = [...new Bun.Glob("scripts/*.ts").scanSync()].map((path) => path.replaceAll("\\", "/"));
    expect(topLevel.sort()).toEqual([...maintained].sort());
  });

  test("gives scheduling judgment to the agent while code protects coverage", async () => {
    const content = await Bun.file(skillPath).text();
    expect(content).toContain("choose `nextCheckAt` from recent activity");
    expect(content).toContain("Code enforces the maximum freshness deadline");
    expect(content).toContain("Search-engine results cannot complete them");
    expect(content).toContain("Only complete scans advance the committed cursor");
    expect(content).toContain("Record every inspected original with a stable platform object ID");
    expect(content).not.toContain("Treat every verified current-season work/project X account as a recurring one-day");
  });

  test("preserves detailed provenance, identity, media, and entity policy in references", async () => {
    const policy = await Bun.file(policyPath).text();
    const update = await Bun.file(updatePath).text();
    const publication = await Bun.file(publicationPath).text();
    expect(policy).toContain("Main-character coverage means the recurring protagonist group");
    expect(policy).toContain("Moegirl may provide Chinese display-name provenance only");
    expect(policy).toContain("real ship's launch date");
    expect(policy).toContain("AI-generated fanwork is out of scope");
    expect(policy).toContain("require the platform AI status to be explicitly non-AI");
    expect(policy).toContain("one anchor `animeId`");
    expect(policy).toContain("all materially covered `animeIds`");
    expect(policy).toContain("萌战吧");
    expect(policy).toContain("is not searched, verified, or enrolled unless the active profile is explicitly `account-discovery`");
    expect(update).toContain("every due already verified, enabled X/Twitter account");
    expect(update).toContain("cast accounts, original authors and other credited creators, and credited production staff");
    expect(update).toContain("separate first-class editorial lanes");
    expect(update).toContain("Do not run season-catalog searches");
    expect(update).toContain("official-site or X update with media");
    expect(publication).toContain("Every automatically published observation, including an official webpage");
    expect(publication).toContain("readable original text as mandatory for every newly published social post");
  });

  test("documents verifiable result coverage and the cross-work candidate shape", async () => {
    const schema = await Bun.file(".agent/skills/yuri-season-research/references/batch-schema.md").text();
    const discovery = await Bun.file(resultsPath).text();
    expect(schema).toContain('"animeIds": ["anime-anchor", "anime-second", "anime-third"]');
    expect(schema).toContain('"publicTranslation"');
    expect(schema).toContain("do not publish a title-and-summary-only social card");
    expect(discovery).toContain('"outcome": "complete"');
    expect(discovery).toContain('"surface": "signed_in_timeline"');
    expect(discovery).toContain('"reachedPreviousCursor": true');
    expect(discovery).toContain('"platformObjectId"');
    expect(discovery).toContain("Search-engine results cannot complete");
  });
});
