import type { ContentClass } from "@/domain";

export const feedFilters: Array<{ label: string; value: string; classes: ContentClass[] }> = [
  { label: "全部", value: "all", classes: [] },
  { label: "公式", value: "official", classes: ["schedule", "official_news", "official_art"] },
  { label: "创作者", value: "creators", classes: ["creator_art", "staff_post"] },
  { label: "声优", value: "cast", classes: ["cast_post"] },
  { label: "同人", value: "fanwork", classes: ["fanwork"] },
  { label: "讨论", value: "community", classes: ["community_thread"] },
];

export type FeedSearch = { q?: string; anime?: string; category?: string };

export function parseFeedSearch(input: Record<string, unknown>): FeedSearch {
  return {
    q: typeof input.q === "string" ? input.q.trim().slice(0, 120) || undefined : undefined,
    anime: typeof input.anime === "string" ? input.anime.trim().slice(0, 100) || undefined : undefined,
    category: feedFilters.some((filter) => filter.value === input.category && filter.value !== "all")
      ? input.category as string : undefined,
  };
}

export function feedClasses(search: FeedSearch) {
  const classes = feedFilters.find((filter) => filter.value === search.category)?.classes;
  return classes?.length ? classes : undefined;
}

export function feedQuery(search: FeedSearch) {
  return { limit: "20", q: search.q, anime: search.anime, classes: feedClasses(search)?.join(",") };
}
