import type { AnimeStatus } from "@/domain";

const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;

export type EpisodeProgressInput = {
  status: AnimeStatus;
  premiereAt: string;
  episodeCount: number | null;
  premiereEpisodeCount: number;
  latestVerifiedEpisode: number | null;
};

function cap(value: number, total: number | null): number {
  return total === null ? value : Math.min(value, total);
}

export function resolveCurrentEpisode(
  input: EpisodeProgressInput,
  now = new Date(),
): number | null {
  if (input.latestVerifiedEpisode !== null)
    return cap(input.latestVerifiedEpisode, input.episodeCount);

  if (input.status === "finished") return input.episodeCount;
  if (input.status !== "airing") return null;

  const premiere = Date.parse(input.premiereAt);
  if (!Number.isFinite(premiere) || now.getTime() < premiere) return null;

  const weeklyAdvances = Math.floor((now.getTime() - premiere) / WEEK_MS);

  return cap(input.premiereEpisodeCount + weeklyAdvances, input.episodeCount);
}
