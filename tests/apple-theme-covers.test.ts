import { describe, expect, test } from "bun:test";
import {
  appleTrackId,
  normalizedTrackName,
  selectExactAppleTrack,
} from "../scripts/prefer-apple-theme-covers";

describe("Apple Music theme-song cover preference", () => {
  test("extracts a track id only from Apple Music links", () => {
    expect(appleTrackId("https://music.apple.com/jp/album/example/123?i=456&uo=4")).toBe("456");
    expect(appleTrackId("https://example.com/album/example/123?i=456")).toBeNull();
    expect(appleTrackId(null)).toBeNull();
  });

  test("normalizes punctuation variants before matching an Apple title", () => {
    expect(normalizedTrackName("しゃいすまっ！")).toBe(normalizedTrackName("しゃいすまっ!"));
    expect(normalizedTrackName("Lu lu lun♪〜ウラハラ気分〜")).toBe(
      normalizedTrackName("Lu lu lun ～ウラハラ気分～"),
    );
  });

  test("selects only one exact title and artist match", () => {
    expect(
      selectExactAppleTrack({ title: "うちゅうのふしぎ", artist: "夢限大みゅーたいぷ" }, [
        {
          wrapperType: "track",
          trackId: 6798086544,
          trackName: "うちゅうのふしぎ",
          artistName: "夢限大みゅーたいぷ",
          trackViewUrl: "https://music.apple.com/jp/song/6798086544",
          artworkUrl100: "https://is1-ssl.mzstatic.com/cover.jpg",
        },
      ]),
    ).toMatchObject({ status: "matched", track: { trackId: 6798086544 } });
    expect(
      selectExactAppleTrack({ title: "うちゅうのふしぎ", artist: "別の歌手" }, [
        {
          wrapperType: "track",
          trackId: 6798086544,
          trackName: "うちゅうのふしぎ",
          artistName: "夢限大みゅーたいぷ",
          trackViewUrl: "https://music.apple.com/jp/song/6798086544",
          artworkUrl100: "https://is1-ssl.mzstatic.com/cover.jpg",
        },
      ]),
    ).toEqual({ status: "missing" });
  });

  test("refuses ambiguous exact matches", () => {
    const base = {
      wrapperType: "track",
      trackName: "Song",
      artistName: "Artist",
      artworkUrl100: "https://is1-ssl.mzstatic.com/cover.jpg",
    };
    expect(
      selectExactAppleTrack({ title: "Song", artist: "Artist" }, [
        { ...base, trackId: 1, trackViewUrl: "https://music.apple.com/jp/song/1" },
        { ...base, trackId: 2, trackViewUrl: "https://music.apple.com/jp/song/2" },
      ]),
    ).toEqual({ status: "ambiguous", trackIds: ["1", "2"] });
  });
});
