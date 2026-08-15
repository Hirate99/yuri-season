import { rpcData } from "@/lib/rpc";
import { adminApi, fetchAdminDashboard } from "./lib/admin-dashboard";

const expected = new Map([
  ["https://x.com/U_sshr/status/2088253407593373725", "筱原侑期待《斗球女弹子》第 7 话"],
  ["https://x.com/futsutsuka_PR/status/2088203986838925373", "《恶女不才，请多关照 ～雏宫蝶鼠换身传～》第 6 话先行图公开"],
  ["https://taiari-anime.com/news/?id=20260814_02", "《感谢对战。～大小姐才不会玩格斗游戏～》第 7 话“小恶魔”剧情简介与先行图"],
  ["https://taiari-anime.com/news/?id=20260814_01", "《感谢对战。～大小姐才不会玩格斗游戏～》公开第二弹私服版 X 头像"],
  ["https://dodge-danko.com/news/detail.php?id=1135414", "《斗球女弹子》公布 8 月 16 日躲避球大赛现场详情"],
]);

const dashboard = await fetchAdminDashboard();
const superseded = dashboard.recentPublications.filter((item) => {
  const title = expected.get(item.url);
  return title != null && item.title !== title;
});
const api = adminApi();
for (const item of superseded) {
  await rpcData(api.api.admin.candidates[":id"].decision.$post({
    param: { id: item.candidateId },
    json: {
      decision: "withdraw",
      reason: "规范名纠错：旧记录使用了与数据库不一致的作品、人名或简称，已由同一原始来源的规范名版本取代。",
    },
  }));
}

process.stdout.write(JSON.stringify({
  withdrawn: superseded.map(({ candidateId, title, url }) => ({ candidateId, title, url })),
}, null, 2));
