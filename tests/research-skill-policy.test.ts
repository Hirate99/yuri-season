import { describe, expect, test } from "bun:test";

const skillPaths = [".agent/skills/yuri-season-research/SKILL.md"] as const;

describe("research skill policy", () => {
  for (const path of skillPaths) {
    test(`${path} keeps the protagonist and translation rules`, async () => {
      const content = await Bun.file(path).text();
      expect(content).toContain("`cycle`: default for scheduled and unattended work");
      expect(content).toContain("there is no fixed query quota");
      expect(content).toContain("Source errors block only the affected source");
      expect(content).toContain("never stop conditions");
      expect(content).not.toContain("Discovery stays capped at 4");
      expect(content).not.toContain("Never lease more than 12 queries");
      expect(content).toContain("Main-character coverage means the recurring protagonist group");
      expect(content).toContain("Moegirl is a translation reference only");
      expect(content).toContain("expected main-group count");
      expect(content).toContain("research:audit:birthdays");
      expect(content).toContain("first_party_source_change");
      expect(content).toContain("real ship's launch date");
      expect(content).toContain("萌战吧");
      expect(content).toContain("AI-generated fanwork is out of scope");
      expect(content).toContain("Require the platform AI status to be explicitly non-AI");
      expect(content).toContain("Do not guess undocumented numeric enum meanings");
      expect(content).toContain("do not put them into a research batch");
      expect(content).toContain("`animeIds` to every materially covered work");
      expect(content).toContain("never duplicate the candidate once per anime");
      expect(content).toContain("remove the few unsupported exceptions");
    });
  }

  test("documents the cross-work community candidate shape", async () => {
    const schema = await Bun.file(".agent/skills/yuri-season-research/references/batch-schema.md").text();
    const discovery = await Bun.file(".agent/skills/yuri-season-research/references/discovery-results.md").text();
    expect(schema).toContain('"animeIds": ["anime-anchor", "anime-second", "anime-third"]');
    expect(schema).toContain("do not emit one duplicate candidate per work");
    expect(discovery).toContain("`animeIds` for a cross-work thread");
  });
});
