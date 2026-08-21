import { buildDiscoveryPlan } from "./lib/discovery-query-plan";
import { fetchDiscoveryContext } from "./lib/discovery-context";
import { createCampaign, hasUnfinishedQueries, type DiscoveryCampaign } from "./lib/discovery-campaign";
import { campaignPathForProfile, parseResearchProfile } from "./lib/research-profile";

function integerArgument(name: string, fallback: number) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${prefix}<positive integer> expected`);
  }
  return value;
}

const force = process.argv.includes("--force");
const replace = process.argv.includes("--replace");
const includeBirthdays = process.argv.includes("--audit-birthdays");
const profileArgument = process.argv.find((argument) => argument.startsWith("--profile="))?.slice("--profile=".length);
const profile = parseResearchProfile(profileArgument, "discovery");
const outputPath = campaignPathForProfile(profile);

function valuesArgument(name: string): Set<string> | null {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  const values = raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (values.length === 0) throw new Error(`${prefix}<comma-separated values> expected`);
  return new Set(values);
}
const animeIds = valuesArgument("anime-id");
const personIds = valuesArgument("person-id");
const platforms = valuesArgument("platform");
if (profile === "account-discovery" && !animeIds?.size && !personIds?.size) {
  throw new Error("--profile=account-discovery requires --anime-id or --person-id");
}
const limit = integerArgument("limit", Number.MAX_SAFE_INTEGER);
const priorFile = Bun.file(outputPath);
if (await priorFile.exists() && !replace) {
  const prior = await priorFile.json() as Partial<DiscoveryCampaign>;
  if (prior.schemaVersion === 3 && prior.mode === "discovery-campaign" && hasUnfinishedQueries(prior as DiscoveryCampaign)) {
    throw new Error("active discovery campaign still has unfinished queries; use campaign status/next or --replace");
  }
}
const context = await fetchDiscoveryContext();
const currentSeason = context.dashboard.seasons.find((season) => season.isCurrent);
if (!currentSeason) throw new Error("current season is missing");
const currentAnime = context.dashboard.anime.filter((anime) => anime.seasonId === currentSeason.id);
const createdAt = new Date();
const queries = buildDiscoveryPlan({
  seasonId: currentSeason.id,
  seasonLabel: currentSeason.label,
  anime: currentAnime,
  resources: context.resources,
  memory: context.memory,
  memoryHits: context.memoryHits,
  now: createdAt,
  force,
  includeBirthdays,
  profile,
  animeIds,
  personIds,
  platforms,
  limit,
});
const result = createCampaign({
  createdAt: createdAt.toISOString(),
  force,
  profile,
  season: { id: currentSeason.id, slug: currentSeason.slug, label: currentSeason.label },
  queryBudget: limit,
  queries,
});
await Bun.write(outputPath, JSON.stringify(result, null, 2));

const byKind = Object.fromEntries(
  [...new Set(queries.map((query) => query.searchKind))].sort().map((kind) => [
    kind,
    queries.filter((query) => query.searchKind === kind).length,
  ]),
);
process.stdout.write(JSON.stringify({
  season: currentSeason.label,
  anime: currentAnime.length,
  resourcesLoaded: Object.keys(context.resources).length,
  rememberedQueries: context.memory.length,
  rememberedHits: context.memoryHits.length,
  force,
  includeBirthdays,
  profile,
  scope: {
    animeIds: animeIds ? [...animeIds] : [],
    personIds: personIds ? [...personIds] : [],
    platforms: platforms ? [...platforms] : [],
  },
  replace,
  campaignId: result.campaignId,
  queries: queries.length,
  byKind,
  path: outputPath,
}, null, 2));
