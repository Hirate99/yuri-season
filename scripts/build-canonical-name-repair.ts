import type { BatchObservation, ResearchBatch } from "@/domain";

async function observations(path: string): Promise<BatchObservation[]> {
  return ((await Bun.file(path).json()) as ResearchBatch).observations;
}

const social = await observations("research-batches/2026-08-15T0015Z-social-original-text-repair.json");
const mediaRepair = await observations("research-batches/2026-08-15T0720Z-media-and-canonical-name-repair.json");
const official = await observations("research-batches/2026-08-14T1606Z-incremental-updates.json");

function select(rows: BatchObservation[], sourceItemId: string) {
  const row = structuredClone(rows.find((item) => item.sourceItemId === sourceItemId));
  if (!row) throw new Error(`missing source observation ${sourceItemId}`);
  return row;
}

function rename(row: BatchObservation, title: string, summary: string) {
  row.title = title;
  row.excerpt = summary;
  for (const candidate of row.candidates) {
    candidate.title = title;
    candidate.summary = summary;
    candidate.review = {
      decision: "publish",
      confidence: 0.99,
      reasons: ["已读取关联资源并使用数据库规范名", "保留同一原始来源与稳定对象 ID"],
      model: "local-codex",
      promptVersion: "canonical-name-repair@2",
    };
  }
  row.metadata = {
    ...(row.metadata ?? {}),
    researchMode: "repair",
    correctionReason: "canonicalize_public_entity_names",
  };
  return row;
}

const shinohara = rename(
  select(social, "2088253407593373725"),
  "筱原侑期待《斗球女弹子》第 7 话",
  "筱原侑转发官方第 7 话先行信息，并邀请观众期待地下超级躲避球大会。",
);
shinohara.mediaDisposition = "none";

const futsutsuka = rename(
  select(mediaRepair, "2088203986838925373"),
  "《恶女不才，请多关照 ～雏宫蝶鼠换身传～》第 6 话先行图公开",
  "《恶女不才，请多关照 ～雏宫蝶鼠换身传～》官方公开第 6 话的四张先行画面。",
);
futsutsuka.publicTranslation = futsutsuka.publicTranslation?.replace("#不才恶女", "#ふつつかな悪女");

const taiariEpisode = rename(
  select(official, "20260814_02"),
  "《感谢对战。～大小姐才不会玩格斗游戏～》第 7 话“小恶魔”剧情简介与先行图",
  "《感谢对战。～大小姐才不会玩格斗游戏～》官方公开第 7 话剧情简介与六张先行截图。",
);

const taiariIcons = rename(
  select(official, "20260814_01"),
  "《感谢对战。～大小姐才不会玩格斗游戏～》公开第二弹私服版 X 头像",
  "《感谢对战。～大小姐才不会玩格斗游戏～》官方开放下载四名角色的私服版 X 头像。",
);

const dodgeEvent = rename(
  select(official, "https://dodge-danko.com/news/detail.php?id=1135414"),
  "《斗球女弹子》公布 8 月 16 日躲避球大赛现场详情",
  "中山真奈加、前田佳织里将参加开闭幕式和午间抽奖，现场还会设置拍照点、发放团扇并提供直播。",
);
dodgeEvent.publicTranslation = dodgeEvent.publicTranslation
  ?.replaceAll("中山真奈香", "中山真奈加")
  .replaceAll("中山真中", "中山真奈加");

const output: ResearchBatch = {
  schemaVersion: "1",
  batchId: "2026-08-15T0815Z-canonical-name-repair-part-1",
  createdAt: "2026-08-15T08:15:00Z",
  agent: "codex/yuri-season-research@5",
  scope: "repair: canonical public names in titles, summaries, and translations",
  note: "Repairs five high-confidence canonical-name conflicts using linked database anime/person records; source text and evidence remain unchanged.",
  observations: [shinohara, futsutsuka, taiariEpisode, taiariIcons, dodgeEvent],
};

const path = "research-batches/2026-08-15T0815Z-canonical-name-repair-part-1.json";
await Bun.write(path, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(JSON.stringify({ path, observations: output.observations.length }, null, 2));
