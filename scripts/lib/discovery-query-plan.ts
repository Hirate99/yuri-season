import type {
  AdminAnimeResources,
  AdminAnimeSummary,
  SearchMemoryHitSummary,
  SearchMemorySummary,
} from "@/domain";
import { accountUpdateQuery, accountUpdateTarget, afterDate } from "./discovery-account-updates";

type SearchKind = SearchMemorySummary["searchKind"];
type ScopeType = SearchMemorySummary["scopeType"];

export type DiscoveryOperation = "search" | "timeline_scan" | "tag_scan";
export type DiscoveryStage = "sources" | "official" | "tags" | "people" | "explore";
export type DiscoverySurface =
  | "signed_in_timeline"
  | "signed_in_search"
  | "public_embed"
  | "platform_api"
  | "public_api"
  | "official_page"
  | "search_engine"
  | "other";

export type DiscoveryCompletionPolicy = {
  allowedCompleteSurfaces: DiscoverySurface[];
  mustReachPreviousCursor: boolean;
  recordEveryOriginal: boolean;
  searchEngineCanComplete: boolean;
};

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
  reason: string;
  operation: DiscoveryOperation;
  stage: DiscoveryStage;
  maxFreshHours: number;
  completionPolicy: DiscoveryCompletionPolicy;
  cursor: Record<string, unknown>;
  socialAuditEligible: boolean;
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
  includeBirthdays?: boolean;
  profile?: "routine" | "social-audit";
  limit: number;
};

type DiscoveryQueryInput = Omit<DiscoveryQuery,
  "id" | "rememberedAt" | "knownHits" | "operation" | "stage"
  | "completionPolicy" | "cursor" | "socialAuditEligible" | "maxFreshHours">
  & Partial<Pick<DiscoveryQuery,
    "operation" | "stage" | "completionPolicy" | "socialAuditEligible" | "maxFreshHours">>;

function coverageDeadlineHours(operation: DiscoveryOperation): number {
  // This is a missed-coverage safety net, not a publishing schedule. The agent
  // chooses the real next check from current activity and unresolved leads.
  return operation === "search" ? 30 * 24 : 24;
}

function memoryKey(scopeType: ScopeType, scopeId: string, searchKind: SearchKind, targetKey: string) {
  return `${scopeType}\u0000${scopeId}\u0000${searchKind}\u0000${targetKey}`;
}

function isDue(memory: SearchMemorySummary | undefined, now: Date) {
  if (!memory) return true;
  if (memory.status === "exhausted") return false;
  if (!memory.nextSearchAt) return true;
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

function hasAppleMusicTrackUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === "music.apple.com"
      && (Boolean(url.searchParams.get("i")) || /\/(?:album|song)\/[^/]+\/\d+$/.test(url.pathname));
  } catch {
    return false;
  }
}

function hasWorkAccount(resources: AdminAnimeResources, animeId: string) {
  return resources.accounts.some((account) => account.ownerType === "anime"
    && account.ownerId === animeId);
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

  function add(query: DiscoveryQueryInput) {
    const key = memoryKey(query.scopeType, query.scopeId, query.searchKind, query.targetKey);
    if (planned.has(key)) return;
    const prior = remembered.get(key);
    if (!input.force && input.profile !== "social-audit" && !isDue(prior, input.now)) return;
    const operation = query.operation ?? "search";
    planned.set(key, {
      ...query,
      operation,
      stage: query.stage ?? "explore",
      maxFreshHours: Math.max(1, query.maxFreshHours ?? coverageDeadlineHours(operation)),
      completionPolicy: query.completionPolicy ?? {
        allowedCompleteSurfaces: [],
        mustReachPreviousCursor: false,
        recordEveryOriginal: false,
        searchEngineCanComplete: true,
      },
      cursor: prior?.cursor ?? {},
      socialAuditEligible: query.socialAuditEligible ?? false,
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
    queryText: `\"${input.seasonLabel}\" 百合 アニメ 新作 公式`, priority: 5,
    reason: "发现可能遗漏的当季作品；搜索结果只作为线索，必须回到公式来源核对",
  });

  const yamiboAliases = [...new Set(input.anime.flatMap((anime) => [
    anime.titleZh,
    anime.titleJa,
    anime.titleEn,
  ]).filter((title): title is string => Boolean(title?.trim())))];
  add({
    scopeType: "season", scopeId: input.seasonId, animeId: null, animeTitle: null,
    searchKind: "community", targetKey: "community:yamibo-recent",
    queryText: `Yamibo recent-board sweep: https://bbs.yamibo.com/forum-5-1.html; match current-season aliases, characters, pairings, and project nicknames; keep dedicated threads plus relevant popular discussions (${yamiboAliases.join(" / ")})`,
    priority: 5,
    reason: "Incrementally scan the Yamibo animation-board thread list instead of relying on indexed exact-title or 专楼 searches; deduplicate canonical thread URLs against database resources and knownHits, then retain dedicated threads and materially active relevant discussions",
  });
  add({
    scopeType: "season", scopeId: input.seasonId, animeId: null, animeTitle: null,
    searchKind: "catalog", targetKey: "season:relationship-catalog",
    queryText: `\"${input.seasonLabel}\" アニメ 女子 関係性 オリジナル`, priority: 4,
    reason: "补充尚未被目录型网站标记为百合的原创或强关系性作品",
  });

  for (const anime of input.anime) {
    const resources = input.resources[anime.id];
    if (!resources) continue;
    const titleJa = anime.titleJa || anime.titleZh;
    const common = { scopeType: "anime" as const, scopeId: anime.id, animeId: anime.id, animeTitle: anime.titleZh };
    if (input.force || !hasRegisteredOfficialSource(resources)) {
      add({ ...common, searchKind: "official_news", targetKey: "official:work",
        queryText: `\"${titleJa}\" 公式 アニメ NEWS`, priority: 5,
        reason: "定位遗漏的公式站、NEWS、专题页与可登记的稳定来源" });
    }
    if (input.force || !hasWorkAccount(resources, anime.id)) {
      add({ ...common, searchKind: "social", targetKey: "social:work",
        queryText: `\"${titleJa}\" 公式 X キャスト スタッフ`, priority: 4,
        reason: "发现公式、制作组与声优相关账号；账号身份必须由公式交叉链接验证" });
    }

    if (input.force || !resources.themeSongs.some((song) => song.verified)) {
      add({ ...common, searchKind: "official_news", targetKey: "music:theme-songs",
        queryText: `"${titleJa}" OP ED 主題歌 オープニング エンディング 公式`, priority: 5,
        reason: "从动画官网、唱片公司或官方音乐页面补齐主题曲、制作名单与页面已有的唱片封面；只接收明确字段" });
    } else {
      const incompleteSongs = resources.themeSongs.filter((song) => song.verified
        && (!hasAppleMusicTrackUrl(song.officialUrl)
          || !song.coverUrl
          || song.coverSourceUrl !== song.officialUrl));
      if (incompleteSongs.length > 0) {
        const titles = [...new Set(incompleteSongs.map((song) => `${song.title} / ${song.artist}`))]
          .slice(0, 3)
          .map((title) => `"${title}"`)
          .join(" ");
        add({ ...common, searchKind: "official_news", targetKey: "music:theme-song-projection",
          queryText: `reconcile verified theme songs for "${titleJa}": ${titles}; resolve an exact title+artist Apple Music track through the official Apple search/lookup API and fill the public action plus Apple artwork; if no exact Apple track exists, preserve first-party identity evidence and leave unsupported fields empty`,
          priority: 4,
          reason: "对账已验证主题曲的完整用户投影：曲目身份仍由第一方来源证明，精确 Apple Music 曲目补试听入口与封面；不存在或歧义时不猜测" });
      }
    }

    for (const account of resources.accounts) {
      if (!account.verified) {
        const cast = resources.cast.filter((item) => item.personId === account.ownerId);
        const staff = resources.staff.find((item) => item.personId === account.ownerId);
        const eligible = account.ownerType === "anime"
          || cast.some((item) => item.isMainGroup)
          || staff?.primaryKind === "author"
          || staff?.primaryKind === "artist";
        const ownerName = account.ownerLabel || account.handle || account.url;
        add({
          scopeType: account.ownerType === "person" ? "person" : "anime",
          scopeId: account.ownerId,
          animeId: anime.id,
          animeTitle: anime.titleZh,
          searchKind: "social",
          targetKey: `verification:${account.id}`,
          queryText: `Verify account identity for ${ownerName} (${account.url}) using a first-party official site, agency/profile page, project-owner announcement, platform verification, or an explicit first-party cross-link; do not use name similarity or search snippets as verification`,
          priority: eligible ? 4 : 2,
          stage: "people",
          accountId: account.id,
          personId: account.ownerType === "person" ? account.ownerId : null,
          characterIds: cast.map((item) => item.characterId),
          platform: account.platform,
          contentLane: cast.length > 0 ? "cast" : account.ownerType === "anime" ? "official" : "creator",
          socialAuditEligible: eligible,
          reason: "未验证账号不能进入内容监控；主动寻找第一方交叉证据，避免账号长期卡在人工待办",
        });
        continue;
      }
      const target = accountUpdateTarget(resources, account, anime.id);
      if (!target) continue;
      const prior = remembered.get(memoryKey(target.scopeType, target.scopeId, "social", target.targetKey));
      add({ ...target, animeId: anime.id, animeTitle: anime.titleZh,
        searchKind: "social",
        operation: target.timelineMode ? "timeline_scan" : "search",
        stage: target.contentLane === "official" ? "official" : "people",
        maxFreshHours: target.timelineMode ? 24 : undefined,
        socialAuditEligible: target.socialAuditEligible,
        completionPolicy: target.timelineMode ? {
          allowedCompleteSurfaces: ["signed_in_timeline", "public_embed", "platform_api"],
          mustReachPreviousCursor: true,
          recordEveryOriginal: true,
          searchEngineCanComplete: false,
        } : undefined,
        queryText: accountUpdateQuery(account, titleJa, prior?.searchedAt ?? null, input.now, target.timelineMode),
        reason: target.timelineMode === "project_persona"
          ? "增量检查已验证的 2.5D 主角组成员／企划人格账号；收录企划、动画及公开职业或创作动态，排除纯日常、无关广告抽奖和仅转发"
          : target.timelineMode === "official"
            ? "持续增量检查已验证的作品官方账号全部原帖；由当前活跃度、活动窗口和未结线索决定下次检查时间，并为合格图片建立关联媒体记录"
          : "检查已验证账号的作品相关新帖；只接受明确关联作品、角色、集数或活动的原始帖" });
    }
    const officialXAccounts = resources.accounts.filter((account) => account.verified
      && account.monitorMode !== "disabled"
      && account.ownerType === "anime"
      && account.ownerId === anime.id
      && ["x", "twitter"].includes(account.platform.toLowerCase()));
    if (officialXAccounts.length > 0) {
      const targetKey = `updates:${anime.id}:x-tags`;
      const prior = remembered.get(memoryKey("anime", anime.id, "social", targetKey));
      const aliases = [...new Set([
        anime.titleZh, anime.titleJa, anime.titleEn,
        ...(Array.isArray(prior?.cursor?.activeTerms)
          ? prior.cursor.activeTerms.filter((value): value is string => typeof value === "string") : []),
        ...resources.cast.filter((item) => item.isMainGroup)
          .flatMap((item) => [item.characterName, item.characterNameNative]),
      ].filter((value): value is string => Boolean(value?.trim())))];
      add({ ...common, searchKind: "social", targetKey,
        operation: "tag_scan", stage: "tags", maxFreshHours: 24, socialAuditEligible: true,
        completionPolicy: {
          allowedCompleteSurfaces: ["signed_in_search", "platform_api"],
          mustReachPreviousCursor: true,
          recordEveryOriginal: true,
          searchEngineCanComplete: false,
        },
        queryText: `X latest hashtag timelines: inspect verified official profiles and recent original posts (${officialXAccounts.map((account) => account.url).join(", ")}) to recover current official work/anime/project hashtags; then inspect Latest results after:${afterDate(prior?.searchedAt ?? null, input.now)} for those tags plus aliases (${aliases.join(" / ")}); verify every original, record every stable post ID, and emit official/cast/creator/media candidates under their normal provenance rules`,
        priority: 5, platform: "X", contentLane: "official",
        reason: "持续发现每部当季作品正在使用的 X 官方标签、动画标签、企划简称及主角组名称；标签来自已验证官方资料与近期官方原帖，所有命中必须回到原帖并与账号监控共享 stable post ID 去重" });
    }
    add({ ...common, searchKind: "media", targetKey: "media:creator-art",
      queryText: `\"${titleJa}\" 描き下ろし 応援イラスト`, priority: 4,
      reason: "寻找作者、Staff 或 Cast 的原始贺图与新绘发布页" });
    const pixivTag = encodeURIComponent(titleJa);
    add({ ...common, searchKind: "media", targetKey: "media:fanwork:pixiv",
      queryText: `pixiv tag search: ${titleJa} (https://www.pixiv.net/ajax/search/artworks/${pixivTag}?word=${pixivTag}&order=date_d&mode=safe&s_mode=s_tag)`,
      priority: 3, platform: "Pixiv", contentLane: "fanwork",
      reason: "用 Pixiv 免登录公开标签接口按新序检查同人；逐条记录已见 artwork ID，只对原作者原帖建候选（默认 hold）" });
    add({ ...common, searchKind: "media", targetKey: "media:fanwork:x",
      queryText: `X fanart: reuse knownHits creator profiles; guest hashtag search unavailable`,
      priority: 2, platform: "X", contentLane: "fanwork",
      reason: "X 站内检索未登录不可用；复查搜索记忆中已知同人作者主页的新作品，只收原作者原帖" });
    add({ ...common, searchKind: "media", targetKey: "media:fanwork:instagram",
      queryText: `Instagram fanart: signed-in browser only`,
      priority: 1, platform: "Instagram", contentLane: "fanwork",
      reason: "Instagram 检索需登录；无登录浏览器时记录 blocked，不伪造线索" });

    const communities = [
      { key: "tieba", site: "tieba.baidu.com", label: "作品贴吧", priority: 3, terms: "专楼 集中讨论" },
      { key: "moesen", site: "tieba.baidu.com/p", label: "萌战吧", priority: 3, terms: "萌战吧 动画 讨论" },
      { key: "nga", site: "nga.cn", label: "NGA", priority: 3, terms: "专楼 集中讨论" },
    ] as const;
    for (const community of communities) {
      if (!input.force && hasCommunity(resources, community.key)) continue;
      add({ ...common, searchKind: "community", targetKey: `community:${community.key}`,
        queryText: `\"${anime.titleZh}\" ${community.terms} site:${community.site}`,
        priority: community.priority,
        reason: `补齐${community.label}的作品相关讨论入口；只保留稳定原帖，不复制正文` });
    }

    const knownPlatforms = new Set(resources.accounts.map((item) =>
      `${item.ownerId}:${item.platform.toLowerCase()}`));
    for (const staff of resources.staff) {
      if (!input.force && !["author", "artist"].includes(staff.primaryKind)) continue;
      if (knownPlatforms.has(`${staff.personId}:x`)) continue;
      const name = displayName(staff.nameNative, staff.name);
      add({ scopeType: "person", scopeId: staff.personId, animeId: anime.id, animeTitle: anime.titleZh,
        searchKind: "social", targetKey: "account:official-x",
        queryText: `\"${name}\" 公式 X \"${titleJa}\"`,
        priority: staff.primaryKind === "author" || staff.primaryKind === "artist" ? 4 : 2,
        reason: `补齐 ${staff.role} 的可验证账号` });
    }
    for (const cast of resources.cast) {
      if (!input.force && !cast.isMainGroup) continue;
      if (input.includeBirthdays === true && cast.isMainGroup && !cast.birthdayVerified) {
        const character = displayName(cast.characterNameNative, cast.characterName);
        add({ scopeType: "character", scopeId: cast.characterId, animeId: anime.id, animeTitle: anime.titleZh,
          searchKind: "birthday", targetKey: "birthday:official",
          queryText: `\"${character}\" 誕生日 公式 \"${titleJa}\"`, priority: 4,
          reason: "只接受公式角色页、公式日历或出版社资料中的明确生日" });
      }
      const person = displayName(cast.personNameNative, cast.personName);
      const accountPlatforms = [
        { platform: "X", key: "x" },
        { platform: "Instagram", key: "instagram" },
      ];
      for (const accountPlatform of accountPlatforms) {
        if (knownPlatforms.has(`${cast.personId}:${accountPlatform.platform.toLowerCase()}`)) continue;
        add({ scopeType: "person", scopeId: cast.personId, animeId: anime.id, animeTitle: anime.titleZh,
          searchKind: "social", targetKey: `account:official-${accountPlatform.key}`,
          queryText: `\"${person}\" 公式 ${accountPlatform.platform} \"${titleJa}\"`,
          priority: 3, personId: cast.personId,
          characterIds: resources.cast.filter((item) => item.personId === cast.personId)
            .map((item) => item.characterId),
          platform: accountPlatform.platform, contentLane: "cast",
          reason: `补齐出演声优的可验证 ${accountPlatform.platform} 账号；名字相同不能作为验证` });
      }
    }
  }

  for (const query of planned.values()) {
    if (query.searchKind !== "social" || query.platform?.toLowerCase() !== "x" || !query.animeId) continue;
    const relatedPrefix = `updates:${query.animeId}:`;
    const relatedHits = input.memory
      .filter((item) => item.searchKind === "social" && item.targetKey.startsWith(relatedPrefix))
      .flatMap((item) => hitsByMemory.get(item.id) ?? [])
      .map((hit) => ({ canonicalUrl: hit.canonicalUrl, title: hit.title, outcome: hit.outcome, lastSeenAt: hit.lastSeenAt }));
    query.knownHits = [...new Map([...query.knownHits, ...relatedHits]
      .map((hit) => [hit.canonicalUrl, hit])).values()];
  }

  const stageRank: Record<DiscoveryStage, number> = { sources: 0, official: 1, tags: 2, people: 3, explore: 4 };
  const selected = [...planned.values()].filter((query) => input.profile !== "social-audit"
    || (query.searchKind === "social" && query.socialAuditEligible));
  return selected
    .sort((a, b) => (input.profile === "social-audit" ? stageRank[a.stage] - stageRank[b.stage] : 0)
      || b.priority - a.priority
      || (a.animeTitle ?? "").localeCompare(b.animeTitle ?? "")
      || a.id.localeCompare(b.id))
    .slice(0, input.limit);
}
