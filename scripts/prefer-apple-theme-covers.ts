import type { AdminAnimeResources, AdminThemeSong, ThemeSongWrite } from "@/domain";
import { rpcData } from "@/lib/rpc";
import { adminApi, fetchAdminDashboard, fetchAdminResources } from "./lib/admin-dashboard";

export type AppleTrack = {
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

export type AppleTrackResolution =
  | { status: "matched"; track: AppleTrack }
  | { status: "missing" }
  | { status: "ambiguous"; trackIds: string[] };

export function selectExactAppleTrack(
  song: Pick<AdminThemeSong, "title" | "artist">,
  tracks: AppleTrack[],
): AppleTrackResolution {
  const matches = tracks.filter((track) => track.wrapperType === "track"
    && track.trackId
    && track.trackViewUrl
    && track.artworkUrl100
    && normalizedTrackName(track.trackName ?? "") === normalizedTrackName(song.title)
    && normalizedTrackName(track.artistName ?? "") === normalizedTrackName(song.artist));
  const unique = [...new Map(matches.map((track) => [String(track.trackId), track])).values()];
  if (unique.length === 0) return { status: "missing" };
  if (unique.length > 1) return { status: "ambiguous", trackIds: unique.map((track) => String(track.trackId)) };
  return { status: "matched", track: unique[0] };
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
  if (!track?.trackName || !track.artworkUrl100 || !track.trackViewUrl) {
    throw new Error(`Apple lookup ${id} did not return a complete track`);
  }
  return track;
}

async function searchAppleTrack(song: Pick<AdminThemeSong, "title" | "artist">): Promise<AppleTrackResolution> {
  const term = encodeURIComponent(`${song.title} ${song.artist}`);
  const response = await fetch(`https://itunes.apple.com/search?term=${term}&country=jp&media=music&entity=song&limit=25`);
  if (!response.ok) throw new Error(`Apple search for ${song.title} returned ${response.status}`);
  const payload = await response.json() as AppleLookupResponse;
  return selectExactAppleTrack(song, payload.results);
}

async function resolveAppleTrack(song: AdminThemeSong): Promise<AppleTrackResolution> {
  const id = appleTrackId(song.officialUrl);
  if (!id) return searchAppleTrack(song);
  return selectExactAppleTrack(song, [await lookupAppleTrack(id)]);
}

function writeWithAppleTrack(song: AdminThemeSong, apple: AppleTrack): ThemeSongWrite {
  const officialUrl = apple.trackViewUrl as string;
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
    officialUrl,
    coverUrl: apple.artworkUrl100 as string,
    coverSourceUrl: officialUrl,
    sourceUrl: song.sourceUrl,
    verified: song.verified,
    sortOrder: song.sortOrder,
  };
}

async function patchThemeSong(animeId: string, song: AdminThemeSong, apple: AppleTrack): Promise<void> {
  await rpcData(adminApi().api.admin.anime[":animeId"].resources[":kind"][":id"].$patch({
    param: { animeId, kind: "theme_song", id: song.id },
    json: writeWithAppleTrack(song, apple),
  }));
}

export async function preferAppleThemeCovers(apply: boolean): Promise<void> {
  const dashboard = await fetchAdminDashboard();
  const currentSeasonIds = new Set(dashboard.seasons.filter((season) => season.isCurrent).map((season) => season.id));
  const anime = dashboard.anime.filter((item) => currentSeasonIds.has(item.seasonId));
  const seen = new Set<string>();
  const summary = { checked: 0, matched: 0, changed: 0, unchanged: 0, missing: 0, ambiguous: 0 };

  for (const item of anime) {
    const resources = await fetchAdminResources(item.id);
    for (const song of resources.themeSongs) {
      if (seen.has(song.id)) continue;
      seen.add(song.id);
      summary.checked += 1;
      const resolution = await resolveAppleTrack(song);
      if (resolution.status === "missing") {
        summary.missing += 1;
        continue;
      }
      if (resolution.status === "ambiguous") {
        summary.ambiguous += 1;
        console.warn(`ambiguous: ${song.title} — ${resolution.trackIds.join(", ")}`);
        continue;
      }
      const apple = resolution.track;
      summary.matched += 1;
      const officialUrl = apple.trackViewUrl as string;
      const coverUrl = apple.artworkUrl100 as string;
      if (song.officialUrl === officialUrl && song.coverUrl === coverUrl && song.coverSourceUrl === officialUrl) {
        summary.unchanged += 1;
        continue;
      }
      if (apply) await patchThemeSong(item.id, song, apple);
      summary.changed += 1;
      console.log(`${apply ? "updated" : "would update"}: ${song.title} — ${apple.artistName ?? song.artist}`);
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...summary }, null, 2));
}

if (import.meta.main) {
  await preferAppleThemeCovers(process.argv.includes("--apply"));
}
