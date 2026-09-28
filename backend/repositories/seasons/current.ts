import type { Season } from "@/domain";
import { calendarParts } from "@/lib/timezone";

export function currentSeasonOn<T extends Season>(seasons: T[], now = new Date()): T | null {
  const { year, month, day } = calendarParts(now, "Asia/Tokyo");
  const today = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const ordered = [...seasons].sort((a, b) => b.startsOn.localeCompare(a.startsOn));

  // Keep the latest available season visible until a newer one begins.
  return ordered.find((season) => season.startsOn <= today) ?? ordered.at(-1) ?? null;
}
