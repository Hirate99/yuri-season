import { fetchAdminDashboard, fetchAdminResources } from "./lib/admin-dashboard";

const dashboard = await fetchAdminDashboard();
const requestedIds = process.argv.slice(2);
const targetIds = new Set(requestedIds.length > 0 ? requestedIds : [
  "anime-azurlane-bisoku-2", "anime-dodge-danko", "anime-futsutsuka",
  "anime-goodbye-lara", "anime-grow-up-show", "anime-magilumiere-2",
  "anime-nanoha-exceeds", "anime-taiari", "anime-yumemita",
]);
const rows = await Promise.all(dashboard.anime.filter((anime) => targetIds.has(anime.id)).map(async (anime) => {
  const resources = await fetchAdminResources(anime.id);
  return {
    animeId: anime.id,
    animeTitle: anime.titleZh,
    cast: resources.cast.map((credit) => ({
      characterId: credit.characterId,
      characterName: credit.characterName,
      characterNameNative: credit.characterNameNative,
      personId: credit.personId,
      personName: credit.personName,
      personNameNative: credit.personNameNative,
    })),
    staff: resources.staff.map((credit) => ({
      personId: credit.personId,
      name: credit.name,
      nameNative: credit.nameNative,
      role: credit.role,
    })),
  };
}));

process.stdout.write(JSON.stringify(rows.filter((row) => row.cast.length || row.staff.length), null, 2));
