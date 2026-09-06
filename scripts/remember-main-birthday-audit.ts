import type { AdminAnimeResources, SearchMemoryWrite } from "@/domain";
import { fetchAdminDashboard, fetchAdminResources } from "./lib/admin-dashboard";
import { rememberSearchRecords } from "./lib/search-memory-client";

type AuditScope = { officialUrl: string; checkedLayers: string };

const auditScopes: Record<string, AuditScope> = {
  "anime-azurlane-bisoku-2": {
    officialUrl: "https://2nd.azurlane-bisoku.jp/character",
    checkedLayers: "动画公式角色页、游戏日服公式角色页及公式账号的逐人生日检索",
  },
  "anime-yumemita": {
    officialUrl: "https://bang-dream-on.bushimo.jp/character/yumemita/",
    checkedLayers: "动画公式角色页与 BanG Dream! Our Notes 第一方角色档案",
  },
  "anime-dodge-danko": {
    officialUrl: "https://dodge-danko.com/",
    checkedLayers: "动画公式角色/NEWS、漫画公式账号及逐人原始帖检索；未采用无法回溯原帖的搜索摘要",
  },
  "anime-futsutsuka": {
    officialUrl: "https://futsutsuka.net/character/",
    checkedLayers: "动画公式角色页与公式 NEWS",
  },
  "anime-goodbye-lara": {
    officialUrl: "https://goodbyelara.com/",
    checkedLayers: "原创动画公式角色、NEWS 与公式账号逐人检索",
  },
  "anime-grow-up-show": {
    officialUrl: "https://growupshow.com/",
    checkedLayers: "作品公式角色档案",
  },
  "anime-kimishinu": {
    officialUrl: "https://kimishinu-anime.com/character/",
    checkedLayers: "动画公式角色/NEWS、一迅社/百合姬及作者公式账号逐人检索",
  },
  "anime-korekaite": {
    officialUrl: "https://www.vap.co.jp/korekaite-shine/",
    checkedLayers: "动画公式角色/NEWS、小学馆与作者公式账号逐人检索",
  },
  "anime-magilumiere-2": {
    officialUrl: "https://magilumiere-pr.com/character/",
    checkedLayers: "动画公式角色/NEWS、少年 Jump+ 与作品公式账号逐人检索",
  },
  "anime-nanoha-exceeds": {
    officialUrl: "https://www.nanoha.com/EXGV/character/",
    checkedLayers: "EXGV 公式角色/NEWS、系列旧公式档案与作品公式账号逐人检索",
  },
  "anime-taiari": {
    officialUrl: "https://taiari-anime.com/",
    checkedLayers: "动画公式角色/NEWS、KADOKAWA/Comic Flapper 与作品公式账号逐人检索",
  },
};

function auditRecord(
  animeId: string,
  cast: AdminAnimeResources["cast"][number],
  searchedAt: string,
): SearchMemoryWrite {
  const scope = auditScopes[animeId];
  if (!scope) throw new Error(`missing birthday audit scope for ${animeId}`);

  const verified =
    cast.birthdayVerified &&
    cast.birthdayMonth !== null &&
    cast.birthdayDay !== null &&
    Boolean(cast.birthdaySourceUrl);

  return {
    scopeType: "character",
    scopeId: cast.characterId,
    searchKind: "birthday",
    targetKey: "birthday:official",
    queryText: `公式生日 ${cast.characterNameNative ?? cast.characterName} ${cast.characterName}`,
    status: "exhausted",
    cursor: { rerunOn: "first_party_source_change" },
    lastResultHash: null,
    lastResultCount: 1,
    usefulResultCount: verified ? 1 : 0,
    searchedAt,
    nextSearchAt: null,
    notes: verified
      ? `${scope.checkedLayers}；第一方日期已经验证并发布。`
      : `${scope.checkedLayers}；截至本次审计未找到第一方生日日期。仅在相关第一方资料变化后重查。`,
    hits: [
      {
        canonicalUrl: verified ? cast.birthdaySourceUrl! : scope.officialUrl,
        title: verified
          ? `${cast.characterName} ${cast.birthdayMonth}月${cast.birthdayDay}日`
          : `${cast.characterName}：公式资料暂未公开生日`,
        contentHash: null,
        outcome: verified ? "published" : "ignored",
        metadata: verified
          ? {
              birthdayMonth: cast.birthdayMonth,
              birthdayDay: cast.birthdayDay,
              sourceTier: "first_party",
            }
          : { birthdayPublished: false, sourceTier: "first_party", rerunOn: "source_change" },
      },
    ],
  };
}

const searchedAt = new Date().toISOString();
const dashboard = await fetchAdminDashboard();
const records: SearchMemoryWrite[] = [];

for (const anime of dashboard.anime) {
  if (!auditScopes[anime.id]) continue;

  const resources = await fetchAdminResources(anime.id);

  for (const cast of resources.cast.filter((item) => item.isMainGroup))
    records.push(auditRecord(anime.id, cast, searchedAt));
}

const result = await rememberSearchRecords(records);
const verified = records.filter((record) => record.usefulResultCount > 0).length;

process.stdout.write(
  JSON.stringify(
    { audited: result.records, verified, unpublished: result.records - verified },
    null,
    2,
  ),
);
