import type {
  AdminAnimeResources,
  AdminAnimeSummary,
  SearchMemoryHitSummary,
  SearchMemorySummary,
} from "@/domain";
import { accountUpdateQuery, accountUpdateTarget } from "./discovery-account-updates";

type SearchKind = SearchMemorySummary["searchKind"];
type ScopeType = SearchMemorySummary["scopeType"];

export type DiscoveryQuery = {
  id: string;
  scopeType: ScopeType;
  scopeId: string;
  animeId: string | null;
  animeTitle: string | null;
  searchKind: SearchKind;
  targetKey: string;
  queryText: string;
  priority: number;
  cadenceDays: number;
  reason: string;
  accountId?: string | null;
  personId?: string | null;
  characterIds?: string[];
  platform?: string | null;
  contentLane?: "official" | "cast" | "creator" | "fanwork" | null;
  rememberedAt: string | null;
  knownHits: Array<Pick<SearchMemoryHitSummary, "canonicalUrl" | "title" | "outcome" | "lastSeenAt">>;
};

type PlanInput = {
  seasonId: string;
  seasonLabel: string;
  anime: AdminAnimeSummary[];
  resources: Record<string, AdminAnimeResources>;
  memory: SearchMemorySummary[];
  memoryHits: SearchMemoryHitSummary[];
  now: Date;
  force: boolean;
  limit: number;
};

function memoryKey(scopeType: ScopeType, scopeId: string, searchKind: SearchKind, targetKey: string) {
  return `${scopeType}\u0000${scopeId}\u0000${searchKind}\u0000${targetKey}`;
}

function isDue(memory: SearchMemorySummary | undefined, now: Date) {
  if (!memory?.nextSearchAt) return true;
  const next = Date.parse(memory.nextSearchAt);
  return Number.isNaN(next) || next <= now.valueOf();
}

function hasCommunity(resources: AdminAnimeResources, community: "yamibo" | "tieba" | "moesen" | "nga") {
  return resources.discussions.some((item) => {
    const platform = item.platform.trim().toLowerCase();
    const url = item.url.toLowerCase();
    if (community === "yamibo") return platform.includes("百合会") || url.includes("yamibo.com");
    if (community === "nga") return platform.includes("nga") || url.includes("nga.cn");
    if (community === "moesen") return platform.includes("萌战吧");
    return platform === "贴吧" || platform === "作品贴吧"
      || (url.includes("tieba.baidu.com") && !platform.includes("萌战吧"));
  });
}

function hasRegisteredOfficialSource(resources: AdminAnimeResources) {
  return resources.sources.some((source) => source.enabled
    && ["official", "verified_creator"].includes(source.trustLevel)
    && source.changeKind === "feed_candidate");
}

function hasVerifiedWorkAccount(resources: AdminAnimeResources, animeId: string) {
  return resources.accounts.some((account) => account.ownerType === "anime"
    && account.ownerId === animeId && account.verified);
}

function displayName(nativeName: string | null, fallback: string) {
  return nativeName?.trim() || fallback.trim();
}

export function buildDiscoveryPlan(input: PlanInput): DiscoveryQuery[] {
  const remembered = new Map(input.memory.map((item) => [
    memoryKey(item.scopeType, item.scopeId, item.searchKind, item.targetKey),
    item,
  ]));
  const hitsByMemory = new Map<string, SearchMemoryHitSummary[]>();
  for (const hit of input.memoryHits) {
    const hits = hitsByMemory.get(hit.memoryId) ?? [];
    hits.push(hit);
    hitsByMemory.set(hit.memoryId, hits);
  }
  const planned = new Map<string, DiscoveryQuery>();

  function add(query: Omit<DiscoveryQuery, "id" | "rememberedAt" | "knownHits">) {
    const key = memoryKey(query.scopeType, query.scopeId, query.searchKind, query.targetKey);
    if (planned.has(key)) return;
    const prior = remembered.get(key);
    if (!input.force && !isDue(prior, input.now)) return;
    planned.set(key, {
      ...query,
      id: key.replaceAll("\u0000", ":"),
      rememberedAt: prior?.searchedAt ?? null,
      knownHits: (prior ? hitsByMemory.get(prior.id) ?? [] : []).map((hit) => ({
        canonicalUrl: hit.canonicalUrl,
        title: hit.title,
        outcome: hit.outcome,
        lastSeenAt: hit.lastSeenAt,
      })),
    });
  }

  add({
    scopeType: "season", scopeId: input.seasonId, animeId: null, animeTitle: null,
    searchKind: "catalog", targetKey: "season:yuri-catalog",
    queryText: `\"${input.seasonLabel}\" 百合 アニメ 新作 公式`, priority: 5, cadenceDays: 7,
    reason: "发现可能遗漏的当季作品；搜索结果只作为线索，必须回到公式来源核对",
  });
  add({
    scopeType: "season", scopeId: input.seasonId, animeId: null, animeTitle: null,
    searchKind: "catalog", targetKey: "season:relationship-catalog",
    queryText: `\"${input.seasonLabel}\" アニメ 女子 関係性 オリジナル`, priority: 4, cadenceDays: 7,
    reason: "补充尚未被目录型网站标记为百合的原创或强关系性作品",
  });

  for (const anime of input.anime) {
    const resources = input.resources[anime.id];
    if (!resources) continue;
    const titleJa = anime.titleJa || anime.titleZh;
    const common = { scopeType: "anime" as const, scopeId: anime.id, animeId: anime.id, animeTitle: anime.titleZh };
    if (!hasRegisteredOfficialSource(resources)) {
      add({ ...common, searchKind: "official_news", targetKey: "official:work",
        queryText: `\"${titleJa}\" 公式 アニメ NEWS`, priority: 5, cadenceDays: 7,
        reason: "定位遗漏的公式站、NEWS、专题页与可登记的稳定来源" });
    }
    if (!hasVerifiedWorkAccount(resources, anime.id)) {
      add({ ...common, searchKind: "social", targetKey: "social:work",
        queryText: `\"${titleJa}\" 公式 X キャスト スタッフ`, priority: 4, cadenceDays: 7,
        reason: "发现公式、制作组与声优相关账号；账号身份必须由公式交叉链接验证" });
    }

    if (!resources.themeSongs.some((song) => song.verified)) {
      add({ ...common, searchKind: "official_news", targetKey: "music:theme-songs",
        queryText: `"${titleJa}" OP ED 主題歌 オープニング エンディング 公式`, priority: 5, cadenceDays: 14,
        reason: "从动画官网、唱片公司或官方音乐页面补齐主题曲、制作名单与页面已有的唱片封面；只接收明确字段" });
    } else {
      const songsWithoutJackets = resources.themeSongs.filter((song) => song.verified && !song.coverUrl);
      if (songsWithoutJackets.length > 0) {
        const titles = [...new Set(songsWithoutJackets.map((song) => song.title))]
          .slice(0, 3)
          .map((title) => `"${title}"`)
          .join(" ");
        add({ ...common, searchKind: "official_news", targetKey: "music:theme-song-jackets",
          queryText: `"${titleJa}" ${titles} ジャケット 公式`, priority: 3, cadenceDays: 30,
          reason: "已验证主题曲缺少封面；只从动画官网、唱片公司或官方发行页补图片 URL 与来源页" });
      }
    }

    for (const account of resources.accounts) {
      const target = accountUpdateTarget(resources, account, anime.id);
      if (!target) continue;
      const prior = remembered.get(memoryKey(target.scopeType, target.scopeId, "social", target.targetKey));
      add({ ...target, animeId: anime.id, animeTitle: anime.titleZh,
        searchKind: "social",
        queryText: accountUpdateQuery(account, titleJa, prior?.searchedAt ?? null, input.now),
        cadenceDays: 7,
        reason: "检查已验证账号的作品相关新帖；只接受明确关联作品、角色、集数或活动的原始帖" });
    }
    add({ ...common, searchKind: "media", targetKey: "media:creator-art",
      queryText: `\"${titleJa}\" 描き下ろし 応援イラスト`, priority: 4, cadenceDays: 7,
      reason: "寻找作者、Staff 或 Cast 的原始贺图与新绘发布页" });
    const fanworkTargets = [
      { key: "pixiv", site: "pixiv.net/artworks", label: "Pixiv" },
      { key: "x", site: "x.com", label: "X" },
      { key: "instagram", site: "instagram.com", label: "Instagram" },
    ];
    for (const target of fanworkTargets) {
      add({ ...common, searchKind: "media", targetKey: `media:fanwork:${target.key}`,
        queryText: `\"${titleJa}\" ファンアート site:${target.site}`, priority: 2, cadenceDays: 14,
        platform: target.label, contentLane: "fanwork",
        reason: `寻找 ${target.label} 原作者发布页；同人默认 link-only 并进入审核` });
    }

    const communities = [
      { key: "yamibo", site: "bbs.yamibo.com", label: "百合会", priority: 4, terms: "专楼 集中讨论" },
      { key: "tieba", site: "tieba.baidu.com", label: "作品贴吧", priority: 3, terms: "专楼 集中讨论" },
      { key: "moesen", site: "tieba.baidu.com/p", label: "萌战吧", priority: 3, terms: "萌战吧 动画 讨论" },
      { key: "nga", site: "nga.cn", label: "NGA", priority: 3, terms: "专楼 集中讨论" },
    ] as const;
    for (const community of communities) {
      if (hasCommunity(resources, community.key)) continue;
      add({ ...common, searchKind: "community", targetKey: `community:${community.key}`,
        queryText: `\"${anime.titleZh}\" ${community.terms} site:${community.site}`,
        priority: community.priority, cadenceDays: 14,
        reason: `补齐${community.label}的作品相关讨论入口；只保留稳定原帖，不复制正文` });
    }

    const verifiedOwners = new Set(resources.accounts.filter((item) => item.verified).map((item) => item.ownerId));
    const verifiedPlatforms = new Set(resources.accounts.filter((item) => item.verified).map((item) =>
      `${item.ownerId}:${item.platform.toLowerCase()}`));
    for (const staff of resources.staff) {
      if (verifiedOwners.has(staff.personId)) continue;
      const name = displayName(staff.nameNative, staff.name);
      add({ scopeType: "person", scopeId: staff.personId, animeId: anime.id, animeTitle: anime.titleZh,
        searchKind: "social", targetKey: "account:official-x",
        queryText: `\"${name}\" 公式 X \"${titleJa}\"`,
        priority: staff.primaryKind === "author" || staff.primaryKind === "artist" ? 4 : 2,
        cadenceDays: 30, reason: `补齐 ${staff.role} 的可验证账号` });
    }
    for (const cast of resources.cast) {
      if (cast.isMainGroup && !cast.birthdayVerified) {
        const character = displayName(cast.characterNameNative, cast.characterName);
        add({ scopeType: "character", scopeId: cast.characterId, animeId: anime.id, animeTitle: anime.titleZh,
          searchKind: "birthday", targetKey: "birthday:official",
          queryText: `\"${character}\" 誕生日 公式 \"${titleJa}\"`, priority: 4, cadenceDays: 30,
          reason: "只接受公式角色页、公式日历或出版社资料中的明确生日" });
      }
      const person = displayName(cast.personNameNative, cast.personName);
      const accountPlatforms = [
        { platform: "X", key: "x" },
        { platform: "Instagram", key: "instagram" },
      ];
      for (const accountPlatform of accountPlatforms) {
        if (verifiedPlatforms.has(`${cast.personId}:${accountPlatform.platform.toLowerCase()}`)) continue;
        add({ scopeType: "person", scopeId: cast.personId, animeId: anime.id, animeTitle: anime.titleZh,
          searchKind: "social", targetKey: `account:official-${accountPlatform.key}`,
          queryText: `\"${person}\" 公式 ${accountPlatform.platform} \"${titleJa}\"`,
          priority: 3, cadenceDays: 30, personId: cast.personId,
          characterIds: resources.cast.filter((item) => item.personId === cast.personId)
            .map((item) => item.characterId),
          platform: accountPlatform.platform, contentLane: "cast",
          reason: `补齐出演声优的可验证 ${accountPlatform.platform} 账号；名字相同不能作为验证` });
      }
    }
  }

  return [...planned.values()]
    .sort((a, b) => b.priority - a.priority || (a.animeTitle ?? "").localeCompare(b.animeTitle ?? "") || a.id.localeCompare(b.id))
    .slice(0, input.limit);
}
