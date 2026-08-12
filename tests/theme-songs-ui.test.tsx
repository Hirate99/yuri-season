import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ThemeSong } from "@/domain";
import { ThemeSongsSection } from "@/features/anime/theme-songs";

const baseSong: ThemeSong = {
  id: "theme-song-opening",
  songKind: "opening",
  sequence: 1,
  title: "Blue Hour",
  artist: "Example Artist",
  lyricist: null,
  composer: null,
  arranger: null,
  episodeRange: null,
  officialUrl: "https://music.example.test/listen",
  coverUrl: "https://music.example.test/blue-hour.jpg",
  coverSourceUrl: "https://music.example.test/releases/blue-hour",
  sourceUrl: "https://anime.example.test/music",
};

describe("theme-song artwork", () => {
  test("lays out two song cards per row on large screens", () => {
    const second = { ...baseSong, id: "theme-song-second", songKind: "ending" } satisfies ThemeSong;
    const html = renderToStaticMarkup(<ThemeSongsSection songs={[baseSong, second]} />);

    expect(html).toContain("lg:grid-cols-2");
  });

  test("renders an available jacket linked to its provenance page", () => {
    const html = renderToStaticMarkup(<ThemeSongsSection songs={[baseSong]} />);

    expect(html).toContain('src="https://music.example.test/blue-hour.jpg"');
    expect(html).toContain('href="https://music.example.test/releases/blue-hour"');
    expect(html).toContain('alt="Blue Hour 封面"');
  });

  test("shows only the Apple Music action when an Apple Music link is available", () => {
    const appleSong = {
      ...baseSong,
      officialUrl: "https://music.apple.com/jp/album/blue-hour/123?i=456",
      coverSourceUrl: "https://music.apple.com/jp/album/blue-hour/123?i=456",
    } satisfies ThemeSong;
    const html = renderToStaticMarkup(<ThemeSongsSection songs={[appleSong]} />);

    expect(html).toContain('aria-label="试听"');
    expect(html).not.toContain('aria-label="资料来源"');
  });

  test("uses a compact OP or ED mark instead of a blank image placeholder", () => {
    const ending = { ...baseSong, id: "theme-song-ending", songKind: "ending", sequence: 2, coverUrl: null, coverSourceUrl: null } satisfies ThemeSong;
    const html = renderToStaticMarkup(<ThemeSongsSection songs={[ending]} />);

    expect(html).not.toContain("<img");
    expect(html).toContain("ED2");
    expect(html).not.toContain("Blue Hour 封面");
  });

  test("keeps an official generic theme-song designation without inferring OP or ED", () => {
    const theme = { ...baseSong, id: "theme-song-generic", songKind: "theme", coverUrl: null, coverSourceUrl: null } satisfies ThemeSong;
    const html = renderToStaticMarkup(<ThemeSongsSection songs={[theme]} />);

    expect(html).toContain("主题曲");
    expect(html).not.toContain(">OP<");
    expect(html).not.toContain(">ED<");
  });
});
