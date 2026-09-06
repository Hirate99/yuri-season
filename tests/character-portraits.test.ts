import { describe, expect, test } from "bun:test";
import {
  characterPortraitObjectPosition,
  verifiedBirthdayPortrait,
} from "@/lib/character-portraits";

describe("verified character portraits", () => {
  test("returns the official portrait for a verified birthday", () => {
    expect(
      verifiedBirthdayPortrait({
        eventType: "birthday",
        verified: true,
        characterPortraitUrl: "https://growupshow.com/assets/img/top/character2/chara04_thumb.png",
        characterPortraitSourceUrl: "https://growupshow.com/#character",
      }),
    ).toEqual({
      imageUrl: "https://growupshow.com/assets/img/top/character2/chara04_thumb.png",
      sourceUrl: "https://growupshow.com/#character",
    });
  });

  test("requires portrait provenance from the character record", () => {
    expect(
      verifiedBirthdayPortrait({
        eventType: "birthday",
        verified: true,
        characterPortraitUrl: "https://example.com/portrait.png",
        characterPortraitSourceUrl: null,
      }),
    ).toBeNull();
  });

  test("does not show portraits for unverified or unrelated events", () => {
    expect(
      verifiedBirthdayPortrait({
        eventType: "birthday",
        verified: false,
        characterPortraitUrl: "https://growupshow.com/assets/img/top/character2/chara04_thumb.png",
        characterPortraitSourceUrl: "https://growupshow.com/#character",
      }),
    ).toBeNull();
    expect(
      verifiedBirthdayPortrait({
        eventType: "event",
        verified: true,
        characterPortraitUrl: "https://growupshow.com/assets/img/top/character2/chara04_thumb.png",
        characterPortraitSourceUrl: "https://growupshow.com/#character",
      }),
    ).toBeNull();
  });
});

describe("character portrait focal points", () => {
  test("keeps tall mobile artwork focused on the face", () => {
    expect(
      characterPortraitObjectPosition(
        "https://dodge-danko.com/assets/webp/sp/character/ichigekidanko/character-ichigekidanko.webp",
      ),
    ).toBe("50% 20%");
  });

  test("uses the illustrated edge of official horizontal cast icons", () => {
    expect(
      characterPortraitObjectPosition(
        "https://www.vap.co.jp/korekaite-shine/assets/img/comment-cast-1-ico.png",
      ),
    ).toBe("left center");
  });

  test("leaves ordinary official thumbnails centered", () => {
    expect(characterPortraitObjectPosition("https://example.com/character.png")).toBe("center");
  });
});
