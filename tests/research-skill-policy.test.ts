import { describe, expect, test } from "bun:test";

const skillPaths = [".agent/skills/yuri-season-research/SKILL.md"] as const;

describe("research skill policy", () => {
  for (const path of skillPaths) {
    test(`${path} keeps the protagonist and translation rules`, async () => {
      const content = await Bun.file(path).text();
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
    });
  }
});
