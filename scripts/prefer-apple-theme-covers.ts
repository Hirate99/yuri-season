import type { AdminAnimeResources, AdminThemeSong, ThemeSongWrite } from "@/domain";
import { rpcData } from "@/lib/rpc";
import { adminApi, fetchAdminDashboard, fetchAdminResources } from "./lib/admin-dashboard";

type AppleTrack = {
  wrapperType?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
};

type AppleLookupResponse = {
  resultCount: number;
  results: AppleTrack[];
};

export function normalizedTrackName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja").replace(/[\p{P}\p{S}\p{Z}]+/gu, "");
}

export function appleTrackId(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname !== "music.apple.com") return null;
    const itemId = url.searchParams.get("i");
    if (itemId && /^\d+$/.test(itemId)) return itemId;
    const pathId = url.pathname.match(/\/(?:album|song)\/[^/]+\/(\d+)$/)?.[1];
    return pathId && /^\d+$/.test(pathId) ? pathId : null;
  } catch {
    return null;
  }
}

async function lookupAppleTrack(id: string): Promise<AppleTrack> {
  const response = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&country=jp&entity=song`);
  if (!response.ok) throw new Error(`Apple lookup ${id} returned ${response.status}`);
  const payload = await response.json() as AppleLookupResponse;
  const track = payload.results.find((item) => item.wrapperType === "track" && String(item.trackId) === id)
    ?? payload.results.find((item) => item.wrapperType === "track");
  if (!track?.trackName || !track.artworkUrl100) throw new Error(`Apple lookup ${id} did not return a track with artwork`);
  return track;
}

function writeWithAppleCover(song: AdminThemeSong, coverUrl: string): ThemeSongWrite {
  return {
    trackId: song.trackId,
    songKind: song.songKind,
    sequence: song.sequence,
    title: song.title,
    artist: song.artist,
    lyricist: song.lyricist,
    composer: song.composer,
    arranger: song.arranger,
    episodeRange: song.episodeRange,
    officialUrl: song.officialUrl,
    coverUrl,
    coverSourceUrl: song.officialUrl,
    sourceUrl: song.sourceUrl,
    verified: song.verified,
    sortOrder: song.sortOrder,
  };
}

async function patchThemeSong(animeId: string, song: AdminThemeSong, coverUrl: string): Promise<void> {
  await rpcData(adminApi().api.admin.anime[":animeId"].resources[":kind"][":id"].$patch({
    param: { animeId, kind: "theme_song", id: song.id },
    json: writeWithAppleCover(song, coverUrl),
  }));
}

export async function preferAppleThemeCovers(apply: boolean): Promise<void> {
  const dashboard = await fetchAdminDashboard();
  const currentSeasonIds = new Set(dashboard.seasons.filter((season) => season.isCurrent).map((season) => season.id));
  const anime = dashboard.anime.filter((item) => currentSeasonIds.has(item.seasonId));
  const seen = new Set<string>();
  const summary = { checked: 0, matched: 0, changed: 0, unchanged: 0, skipped: 0 };

  for (const item of anime) {
    const resources = await fetchAdminResources(item.id);
    for (const song of resources.themeSongs) {
      if (seen.has(song.id)) continue;
      seen.add(song.id);
      const id = appleTrackId(song.officialUrl);
      if (!id) {
        summary.skipped += 1;
        continue;
      }
      summary.checked += 1;
      const apple = await lookupAppleTrack(id);
      if (normalizedTrackName(apple.trackName ?? "") !== normalizedTrackName(song.title)) {
        throw new Error(`Apple title mismatch for ${song.title}: ${apple.trackName ?? "missing title"}`);
      }
      summary.matched += 1;
      const coverUrl = apple.artworkUrl100 as string;
      if (song.coverUrl === coverUrl && song.coverSourceUrl === song.officialUrl) {
        summary.unchanged += 1;
        continue;
      }
      if (apply) await patchThemeSong(item.id, song, coverUrl);
      summary.changed += 1;
      console.log(`${apply ? "updated" : "would update"}: ${song.title} — ${apple.artistName ?? song.artist}`);
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...summary }, null, 2));
}

if (import.meta.main) {
  await preferAppleThemeCovers(process.argv.includes("--apply"));
}
