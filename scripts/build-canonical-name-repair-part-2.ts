import type { BatchCandidate, BatchObservation, ResearchBatch } from "@/domain";

const source = (await Bun.file(
  "research-batches/2026-08-15T0015Z-social-original-text-repair.json",
).json()) as ResearchBatch;

function select(sourceItemId: string): BatchObservation {
  const row = source.observations.find((item) => item.sourceItemId === sourceItemId);
  if (!row) throw new Error(`missing source observation ${sourceItemId}`);
  return structuredClone(row);
}

function rename(row: BatchObservation, title: string, summary: string, translation?: string) {
  row.title = title;
  row.excerpt = summary;
  if (translation !== undefined) row.publicTranslation = translation;
  row.metadata = {
    ...(row.metadata ?? {}),
    researchMode: "repair",
    correctionReason: "canonicalize_public_entity_names_and_restore_source_media",
  };
  for (const candidate of row.candidates) {
    candidate.title = title;
    candidate.summary = summary;
    candidate.review = {
      decision: "publish",
      confidence: 0.99,
      reasons: ["使用数据库规范作品名", "保留同一原始来源与稳定对象 ID", "原帖媒体已核验并存入生产 R2"],
      model: "local-codex",
      promptVersion: "canonical-name-repair@3",
    };
  }
  return row;
}

type Asset = {
  r2Key: string;
  sourceUrl: string;
  contentHash: string;
  byteSize: number;
  altText: string;
};

function attach(row: BatchObservation, mediaTitle: string, creatorName: string, assets: Asset[]) {
  const candidate = row.candidates[0] as BatchCandidate;
  candidate.media = {
    contentClass: "official_art",
    title: mediaTitle,
    creatorName,
    creatorUrl: row.canonicalUrl.replace(/\/status\/.+$/u, ""),
    originalUrl: row.canonicalUrl,
    previewUrl: `https://r2.i-yuri.com/${assets[0].r2Key}`,
    presentationMode: "mirrored_with_permission",
    safetyRating: "safe",
    spoilerLevel: candidate.spoilerLevel,
    rightsNote: "动画官方账号公开的宣传媒体；未见禁止转载标注，保留原帖署名、来源与撤回路径。",
    assets: assets.map((asset, index) => ({
      ...asset,
      mimeType: "image/jpeg",
      sortOrder: index,
      variant: "original",
      rightsStatus: "official_promo_reviewed",
      rightsBasis: "动画官方账号公开的宣传媒体；未见禁止转载标注，保留原帖署名、来源与撤回路径。",
    })),
  };
  row.mediaDisposition = "attached";
  delete row.mediaDispositionReason;
  return row;
}

const azur = attach(rename(
  select("2088256830007132302"),
  "《碧蓝航线：微速前行！第二季》第 7 话当日播出提醒",
  "《碧蓝航线：微速前行！第二季》官方公布第 7 话播出时间，并附上关岛主持的 Web 预告。",
  "◆第7话《神一般的休息日度过方式。》今天播出！\nTOKYO MX：25:05～\nBS11：25:00～\n\n本周大家为了恢复精神，前往山中享受森林浴！\n\nYouTube 上，宣传队长关岛也正热热闹闹地带来下集预告！\n\nhttps://youtube.com/watch?v=PGOLnJ07ruk\n\n#びそくアニメ",
), "第 7 话 Web 预告画面", "《碧蓝航线：微速前行！第二季》动画官方", [{
  r2Key: "yuri/azurlane-bisoku-2/2026-08-14/7b46b006bdcd95f0-broadcast-preview.jpg",
  sourceUrl: "https://pbs.twimg.com/media/HPWlXXJWIAA1r2W?format=jpg&name=orig",
  contentHash: "7b46b006bdcd95f0e12f563e926697841d35d5481b4e0327f4aa207260b6e84d",
  byteSize: 204457,
  altText: "《碧蓝航线：微速前行！第二季》第 7 话 Web 预告画面",
}]);

const nanohaYada = attach(rename(
  select("2088249564084211810"),
  "《魔法少女奈叶 EXCEEDS》第 6 话矢田悠祐演后评论",
  "《魔法少女奈叶 EXCEEDS》官方发布矢田悠祐对第 6 话的演后评论。",
  "#魔法少女奈叶EXCEEDS 演员评论已送达！\n\n第06话《蔵木エイジ与篠宮マナ／阳光》播出后的演员评论：\n\n蔵木エイジ役／矢田悠祐：\n“所谓正义本来就是主观的。只要他们自己这样认为，那对他们而言就是正义。”\n\n完整内容请见原帖链接。",
), "第 6 话矢田悠祐演后评论图", "《魔法少女奈叶 EXCEEDS》动画官方", [{
  r2Key: "yuri/nanoha-exceeds/2026-08-14/b52eec6ca7e25700-cast-comment-yada.jpg",
  sourceUrl: "https://pbs.twimg.com/media/HPrz6PQbkAAIriE?format=jpg&name=orig",
  contentHash: "b52eec6ca7e25700b978a9d5c609b5b8ccec7549e5313c9b4ab5cc8f0b75c590",
  byteSize: 174882,
  altText: "矢田悠祐对《魔法少女奈叶 EXCEEDS》第 6 话的演后评论",
}]);

const nanohaUesaka = attach(rename(
  select("2088249317488259337"),
  "《魔法少女奈叶 EXCEEDS》第 6 话上坂堇演后评论",
  "《魔法少女奈叶 EXCEEDS》官方发布上坂堇对第 6 话的演后评论。",
  "#魔法少女奈叶EXCEEDS 演员评论已送达！\n\n第06话《蔵木エイジ与篠宮マナ／阳光》播出后的演员评论：\n\n篠宮マナ役／上坂堇：\n“能够自由自在、随心所欲地演绎不断使坏的マナ，我非常开心！”\n\n完整内容请见原帖链接。",
), "第 6 话上坂堇演后评论图", "《魔法少女奈叶 EXCEEDS》动画官方", [{
  r2Key: "yuri/nanoha-exceeds/2026-08-14/3de3fdb5e070e5d0-cast-comment-uesaka.jpg",
  sourceUrl: "https://pbs.twimg.com/media/HPrzr4TaQAA1FKA?format=jpg&name=orig",
  contentHash: "3de3fdb5e070e5d01fe773b8edf7e99c4dd7876d0fb1bf99fabda121fd9cd322",
  byteSize: 187278,
  altText: "上坂堇对《魔法少女奈叶 EXCEEDS》第 6 话的演后评论",
}]);

const growPreview = attach(rename(
  select("2088203989233844467"),
  "《向日葵马戏团》第 7 话角色旁白预告",
  "《向日葵马戏团》官方发布由角色配音旁白呈现的第 7 话预告。",
  "第7话预告影像公开。\n\n《向日葵马戏团》的预告影像采用新录制的角色语音，由作品角色回答有关向日葵马戏团的采访。\n\n这次由由良茜作答。\n\nhttps://youtu.be/Sut0mxN1WXM\n\n8月15日（周六）24:00起播出！",
), "第 7 话角色旁白预告画面", "《向日葵马戏团》动画官方", [{
  r2Key: "yuri/grow-up-show/2026-08-14/edb016f0567778f9-episode-07-video-poster.jpg",
  sourceUrl: "https://pbs.twimg.com/amplify_video_thumb/2088187329072795648/img/J6zHLN3N9iMzQvfU.jpg?name=orig",
  contentHash: "edb016f0567778f930193e5eb1db3ea2468446f4d010c507117061c384f83d4c",
  byteSize: 116870,
  altText: "《向日葵马戏团》第 7 话角色旁白预告画面",
}]);

const growSchool = attach(rename(
  select("2088188891228688790"),
  "《向日葵马戏团》声优探访马戏学校前篇",
  "《向日葵马戏团》官方发布出演声优探访马戏学校的视频前篇。",
  "影像公开｜潜入马戏学校 前篇\n\nhttps://youtu.be/tNqfJJTFt64\n\n野田朋花与黑崎诗织潜入日本国内唯一的马戏学校！\n\n马戏学校究竟是怎样的学校……？敬请观看。\n\n#向日葵马戏团",
), "声优探访马戏学校前篇", "《向日葵马戏团》动画官方", [{
  r2Key: "yuri/grow-up-show/2026-08-14/83ba4aaa914a996e-circus-school.jpg",
  sourceUrl: "https://pbs.twimg.com/media/HPqzi7gbMAARq3k?format=jpg&name=orig",
  contentHash: "83ba4aaa914a996e3e2976d39f58d1f5f7a1d0e3def6a0f18693aa453a6bcdf1",
  byteSize: 405785,
  altText: "《向日葵马戏团》声优探访马戏学校",
}]);

const futsutsuka = attach(rename(
  select("2088188890658357610"),
  "《恶女不才，请多关照 ～雏宫蝶鼠换身传～》Blu-ray 店铺特典图公开",
  "《恶女不才，请多关照 ～雏宫蝶鼠换身传～》官方展示 Blu-ray 法人店铺特典设计。",
  "Blu-ray 特典信息\n\n公开各法人店铺的 Blu-ray 特典设计。\n\n请一定不要错过使用全新绘制插图制作的豪华特典。\n\n法人特典信息：\nhttps://futsutsuka.net/blu-ray/tokuten.html\n\n#ふつつかな悪女",
), "Blu-ray 店铺特典图", "《恶女不才，请多关照 ～雏宫蝶鼠换身传～》动画官方", [
  ["a94f3557a2041db5", "HPqXhH7bMAEOZQn", "a94f3557a2041db5cea7fca24bf47897e80f5eabbc4c9d0c0e02375506bd0d2f", 1050223],
  ["43e35ba5ff27ddf5", "HPqXkLmbMAAbitM", "43e35ba5ff27ddf5920c9250b9bbd4ee1bc84f7dd5fc720eb7b45aa7b9c46964", 1098662],
  ["1fbd8549c0635ffe", "HPqXoY2b0AI6NW9", "1fbd8549c0635ffe9477f35d7dc822409be627dd95ce818ddf23892a1214b22b", 794376],
  ["8ebca43849b0b96d", "HPqXpUsboAATtlN", "8ebca43849b0b96d8f304d505c06ec82ad24d07513977fc08f9f589fba14d86c", 887867],
].map(([shortHash, mediaId, contentHash, byteSize], index) => ({
  r2Key: `yuri/futsutsuka/2026-08-14/${shortHash}-bluray-benefit-0${index + 1}.jpg`,
  sourceUrl: `https://pbs.twimg.com/media/${mediaId}?format=jpg&name=orig`,
  contentHash: String(contentHash),
  byteSize: Number(byteSize),
  altText: `《恶女不才，请多关照 ～雏宫蝶鼠换身传～》Blu-ray 店铺特典图 ${index + 1}`,
})));

const magilumiere = attach(rename(
  select("2088188884609896625"),
  "《魔法光源股份有限公司 第二季》第 7 话 Web 预告",
  "《魔法光源股份有限公司 第二季》官方发布第 7 话 Web 预告。",
  "《魔法光源股份有限公司 第二季》Web 版预告影像。\n\n第7话《怎么想都是比赛结束了吧》\n\n第7话将于8月15日（周六）24:55起，在日本电视台系列陆续面向全国播出。\n\n#株式会社マジルミエ",
), "第 7 话 Web 预告画面", "《魔法光源股份有限公司 第二季》动画官方", [{
  r2Key: "yuri/magilumiere-2/2026-08-14/e7ee21bf2f0607b5-episode-07-video-poster.jpg",
  sourceUrl: "https://pbs.twimg.com/media/HPlXj6TawAAvYiQ?format=jpg&name=orig",
  contentHash: "e7ee21bf2f0607b51c5cc5a97f7d00df0e6c21fafe802660410d753c88e742da",
  byteSize: 885042,
  altText: "《魔法光源股份有限公司 第二季》第 7 话 Web 预告画面",
}]);

const lara = rename(
  select("2088267160917622831"),
  "《再见菈菈》第 7 回 X Space 存档",
  "《再见菈菈》官方发布第 7 回 X Space 节目的存档入口。",
  "#さよララスペース配信 第7回～第7话推荐～\n\n感谢今天收听《再见菈菈》Space 直播的各位。引用内容中也有存档，欢迎收听！\n\n下次嘉宾是角色设计谷紫织！欢迎使用 #さよララスペース配信 发布问题与感想。周五晚上请轻松收听。\n\n播出时间：8月21日（周五）21点左右\n出演：小出卓史（导演）、森山菜月（创意制片人）、谷紫织（角色设计）\n播出地点：《再见菈菈》官方 X",
);
lara.mediaDisposition = "unavailable";
lara.mediaDispositionReason = "原帖媒体直链在本轮核验时返回 404；不以作品封面或其他图片替代，保留原帖入口待后续恢复。";

const output: ResearchBatch = {
  schemaVersion: "1",
  batchId: "2026-08-15T0835Z-canonical-name-and-media-repair-part-2",
  createdAt: "2026-08-15T08:35:00Z",
  agent: "codex/yuri-season-research@5",
  scope: "repair: canonical public names and missing source media",
  note: "Repairs eight high-confidence canonical-name conflicts. Ten official source assets were verified in production R2; the one unavailable Lara asset remains link-only with a concrete 404 reason.",
  observations: [azur, nanohaYada, nanohaUesaka, growPreview, growSchool, futsutsuka, magilumiere, lara],
};

const path = "research-batches/2026-08-15T0835Z-canonical-name-and-media-repair-part-2.json";
await Bun.write(path, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(JSON.stringify({ path, observations: output.observations.length }, null, 2));
