import { describe, expect, test } from "bun:test";
import { mainCharacterRepairs } from "../scripts/sync-main-character-profiles";

describe("main character profile repair batch", () => {
  test("covers every audited portrait gap exactly once", () => {
    expect(mainCharacterRepairs).toHaveLength(41);
    expect(new Set(mainCharacterRepairs.map((item) => `${item.animeId}/${item.characterId}`)).size).toBe(41);
    expect(new Set(mainCharacterRepairs.map((item) => item.portraitUrl)).size).toBe(41);
  });

  test("keeps an official page as provenance for every portrait", () => {
    for (const repair of mainCharacterRepairs) {
      expect(repair.portraitUrl).toMatch(/^https:\/\//);
      expect(repair.portraitSourceUrl).toMatch(/^https:\/\//);
      expect(new URL(repair.portraitSourceUrl).hostname).not.toBe("www.google.com");
    }
  });

  test("pairs every supplied profile with an official source page", () => {
    for (const repair of mainCharacterRepairs.filter((item) => item.characterProfile)) {
      expect(repair.profileSourceUrl).toMatch(/^https:\/\//);
    }
  });
});
