import type { AdminAccount, AdminAnimeResources } from "@/domain";

export type AccountUpdateTarget = {
  scopeType: "anime" | "person";
  scopeId: string;
  targetKey: string;
  priority: number;
  accountId: string;
  personId: string | null;
  characterIds: string[];
  platform: string;
  contentLane: "official" | "cast" | "creator";
};

function hasRegisteredSource(resources: AdminAnimeResources, accountId: string) {
  return resources.sources.some((source) => source.enabled
    && source.accountId === accountId
    && source.changeKind === "feed_candidate");
}

function priority(resources: AdminAnimeResources, account: AdminAccount) {
  if (account.ownerType === "anime") return 5;
  const staff = resources.staff.find((item) => item.personId === account.ownerId);
  if (staff?.primaryKind === "author" || staff?.primaryKind === "artist") return 4;
  if (resources.cast.some((item) => item.personId === account.ownerId)) return 3;
  return 2;
}

export function accountUpdateTarget(
  resources: AdminAnimeResources,
  account: AdminAccount,
  animeId: string,
): AccountUpdateTarget | null {
  if (!account.verified || account.monitorMode === "disabled") return null;
  if (account.monitorMode !== "local" && hasRegisteredSource(resources, account.id)) return null;
  const cast = resources.cast.filter((item) => item.personId === account.ownerId);
  const contentLane = account.ownerType === "anime"
    ? "official" as const
    : cast.length > 0 ? "cast" as const : "creator" as const;
  return {
    scopeType: account.ownerType === "person" ? "person" : "anime",
    scopeId: account.ownerType === "person" ? account.ownerId : animeId,
    targetKey: `updates:${animeId}:${account.id}`,
    priority: priority(resources, account),
    accountId: account.id,
    personId: account.ownerType === "person" ? account.ownerId : null,
    characterIds: cast.map((item) => item.characterId),
    platform: account.platform,
    contentLane,
  };
}

function afterDate(searchedAt: string | null, now: Date) {
  const previous = searchedAt ? Date.parse(searchedAt) : Number.NaN;
  const anchor = Number.isNaN(previous)
    ? now.valueOf() - 30 * 86_400_000
    : previous - 86_400_000;
  return new Date(anchor).toISOString().slice(0, 10);
}

export function accountUpdateQuery(
  account: AdminAccount,
  title: string,
  searchedAt: string | null,
  now: Date,
) {
  const after = afterDate(searchedAt, now);
  const accountName = account.handle?.trim() || account.platform.trim();
  try {
    const parsed = new URL(account.url);
    const pathname = parsed.pathname.replace(/^\/+|\/+$/g, "");
    if ((parsed.hostname === "x.com" || parsed.hostname === "twitter.com") && pathname) {
      return `site:x.com/${pathname.split("/")[0]} "${title}" after:${after}`;
    }
    if ((parsed.hostname === "instagram.com" || parsed.hostname === "www.instagram.com") && pathname) {
      return `site:instagram.com/${pathname.split("/")[0]} "${title}" after:${after}`;
    }
    if (parsed.hostname === "bsky.app" && pathname.startsWith("profile/")) {
      return `site:bsky.app/${pathname} "${title}" after:${after}`;
    }
  } catch {
    // Old imported rows can predate current URL validation.
  }
  return `"${accountName}" "${title}" ${account.platform} after:${after}`;
}
