import type { AdminAnimeCoverage } from "./admin";

type Check = { label: string; value: string; ready: boolean; core?: boolean };

export function coverageChecks(item: AdminAnimeCoverage): Check[] {
  return [
    { label: "海报", value: item.hasCover ? "1" : "0", ready: item.hasCover, core: true },
    { label: "放送", value: String(item.broadcasts), ready: item.broadcasts > 0, core: true },
    { label: "Staff", value: String(item.staff), ready: item.staff > 0, core: true },
    { label: "主角团", value: `${item.mainCharacters}/${item.mainCharacterExpected ?? "?"}`, ready: item.mainCharacterExpected !== null && item.mainCharacters === item.mainCharacterExpected, core: true },
    { label: "角色来源", value: String(item.sourcedMainCharacters), ready: item.mainCharacters > 0 && item.sourcedMainCharacters === item.mainCharacters, core: true },
    { label: "中文名来源", value: String(item.namedMainCharacters), ready: item.mainCharacters > 0 && item.namedMainCharacters === item.mainCharacters },
    { label: "生日核验", value: `${item.auditedMainBirthdays}/${item.mainCharacters}`, ready: item.mainCharacters > 0 && item.auditedMainBirthdays === item.mainCharacters },
    { label: "已公开生日", value: String(item.verifiedMainBirthdays), ready: true },
    { label: "账号", value: String(item.verifiedAccounts), ready: item.verifiedAccounts > 0, core: true },
    { label: "来源", value: String(item.sources), ready: item.sources > 0, core: true },
    { label: "音乐", value: String(item.themeSongs), ready: item.themeSongs > 0 },
    { label: "歌曲封面", value: String(item.themeSongCovers), ready: item.themeSongs > 0 && item.themeSongCovers === item.themeSongs },
    { label: "事件", value: String(item.verifiedEvents), ready: item.verifiedEvents > 0 },
    { label: "讨论", value: String(item.discussions), ready: item.discussions > 0 },
    { label: "图像", value: String(item.media), ready: item.media > 0 },
  ];
}
