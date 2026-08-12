import { describe, expect, test } from "bun:test";
import { appleTrackId, normalizedTrackName } from "../scripts/prefer-apple-theme-covers";

describe("Apple Music theme-song cover preference", () => {
  test("extracts a track id only from Apple Music links", () => {
    expect(appleTrackId("https://music.apple.com/jp/album/example/123?i=456&uo=4")).toBe("456");
    expect(appleTrackId("https://example.com/album/example/123?i=456")).toBeNull();
    expect(appleTrackId(null)).toBeNull();
  });

  test("normalizes punctuation variants before matching an Apple title", () => {
    expect(normalizedTrackName("しゃいすまっ！")).toBe(normalizedTrackName("しゃいすまっ!"));
    expect(normalizedTrackName("Lu lu lun♪〜ウラハラ気分〜")).toBe(normalizedTrackName("Lu lu lun ～ウラハラ気分～"));
  });
});
