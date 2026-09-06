import type { AdminAnimeResources } from "@/domain";
import { fetchAdminDashboard, fetchAdminResources } from "./lib/admin-dashboard";

const dashboard = await fetchAdminDashboard();

const currentSeasonIds = new Set(
  dashboard.seasons.filter((season) => season.isCurrent).map((season) => season.id),
);

const anime = dashboard.anime.filter((item) => currentSeasonIds.has(item.seasonId));
const rows = [];

for (const item of anime) {
  const resources = await fetchAdminResources(item.id);

  for (const cast of resources.cast.filter((credit) => credit.isMainGroup)) {
    rows.push({
      animeId: item.id,
      animeTitle: item.titleZh,
      castCreditId: cast.id,
      characterId: cast.characterId,
      characterName: cast.characterName,
      characterNameNative: cast.characterNameNative,
      personName: cast.personName,
      nameSourceUrl: cast.nameSourceUrl,
      characterProfile: cast.characterProfile,
      profileSourceUrl: cast.profileSourceUrl,
      portraitUrl: cast.portraitUrl,
      portraitSourceUrl: cast.portraitSourceUrl,
      hasNameSource: Boolean(cast.nameSourceUrl),
      hasProfile: Boolean(cast.characterProfile && cast.profileSourceUrl),
      hasPortrait: Boolean(cast.portraitUrl && cast.portraitSourceUrl),
    });
  }
}

const complete = rows.filter(
  (row) => row.hasNameSource && row.hasProfile && row.hasPortrait,
).length;

const report = {
  anime: anime.length,
  mainCharacters: rows.length,
  complete,
  withNameSource: rows.filter((row) => row.hasNameSource).length,
  withProfile: rows.filter((row) => row.hasProfile).length,
  withPortrait: rows.filter((row) => row.hasPortrait).length,
  rows,
};

process.stdout.write(
  JSON.stringify(
    process.argv.includes("--summary") ? { ...report, rows: undefined } : report,
    null,
    2,
  ),
);
