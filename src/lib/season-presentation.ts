import type { Season } from "@/domain";

export type SeasonVisualName = "spring" | "summer" | "autumn" | "winter";

export const seasonVisuals: Record<SeasonVisualName, { glyph: string; english: string }> = {
  spring: { glyph: "春", english: "SPRING" },
  summer: { glyph: "夏", english: "SUMMER" },
  autumn: { glyph: "秋", english: "AUTUMN" },
  winter: { glyph: "冬", english: "WINTER" },
};

export const seasonPalettes: Record<SeasonVisualName, {
  base: string;
  warm: string;
  light: string;
  cool: string;
  deep: string;
  rotation: number;
}> = {
  spring: {
    base: "#b9a8d5",
    warm: "#e99aaa",
    light: "#eed46f",
    cool: "#91bea5",
    deep: "#655292",
    rotation: -10,
  },
  summer: {
    base: "#8fcfc6",
    warm: "#eb8b70",
    light: "#efd451",
    cool: "#7460aa",
    deep: "#30396f",
    rotation: 0,
  },
  autumn: {
    base: "#c99a55",
    warm: "#c96f5e",
    light: "#dfc16d",
    cool: "#788467",
    deep: "#76516f",
    rotation: 11,
  },
  winter: {
    base: "#abc9dc",
    warm: "#c99bac",
    light: "#d8d9dc",
    cool: "#8d96c3",
    deep: "#454d71",
    rotation: 20,
  },
};

export function seasonVisualName(season: Season): SeasonVisualName {
  const fromSlug = (Object.keys(seasonVisuals) as SeasonVisualName[])
    .find((name) => season.slug.toLowerCase().includes(name));
  if (fromSlug) return fromSlug;

  const glyph = season.label.match(/[春夏秋冬]/)?.[0];
  if (glyph === "春") return "spring";
  if (glyph === "夏") return "summer";
  if (glyph === "秋") return "autumn";
  if (glyph === "冬") return "winter";

  const month = Number(season.startsOn.slice(5, 7));
  if (month >= 4 && month <= 6) return "spring";
  if (month >= 7 && month <= 9) return "summer";
  if (month >= 10) return "autumn";
  return "winter";
}
