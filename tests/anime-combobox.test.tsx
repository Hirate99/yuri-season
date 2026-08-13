import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { CatalogResponse } from "@/domain";
import { AnimeCombobox } from "@/components/anime-combobox";

const anime = [{
  id: "anime-1",
  slug: "example",
  titleZh: "示例作品",
  titleJa: "サンプル",
  titleEn: "Sample",
}] as CatalogResponse["anime"];

describe("anime combobox", () => {
  test("renders a button-triggered selector showing the current selection", () => {
    const html = renderToStaticMarkup(<AnimeCombobox anime={anime} value="example" onChange={() => {}} />);

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-label="按作品筛选"');
    expect(html).toContain("示例作品");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("<input");
  });
});
