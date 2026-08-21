export function rotatingSourceSelection<T extends { id: string }>(
  sources: T[],
  cursor: string | undefined,
  limit: number,
): { selected: T[]; cursor: string | undefined; remaining: number } {
  if (sources.length === 0 || limit <= 0) return { selected: [], cursor, remaining: sources.length };
  const sorted = [...sources].sort((first, second) => first.id.localeCompare(second.id));
  const cursorIndex = cursor ? sorted.findIndex((source) => source.id === cursor) : -1;
  const start = cursorIndex >= 0 ? (cursorIndex + 1) % sorted.length : 0;
  const count = Math.min(Math.floor(limit), sorted.length);
  const selected = Array.from({ length: count }, (_, offset) => sorted[(start + offset) % sorted.length]);
  return {
    selected,
    cursor: selected.at(-1)?.id ?? cursor,
    remaining: Math.max(0, sorted.length - selected.length),
  };
}

export function isRoutineUpdateSource(source: {
  enabled: boolean;
  sourceType: string;
  trustLevel: string;
}): boolean {
  if (!source.enabled || !["official", "verified_creator"].includes(source.trustLevel)) return false;
  return ["official_page", "official_json", "rss", "youtube", "social"].includes(source.sourceType);
}
