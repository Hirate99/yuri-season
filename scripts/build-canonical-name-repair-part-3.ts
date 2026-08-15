import type { BatchObservation, ResearchBatch } from "@/domain";

const sourcePaths = [
  "research-batches/2026-08-14T0630Z-full-season-social-increment.json",
  "research-batches/2026-08-13T0554Z-x-verified-posts.json",
  "research-batches/2026-08-13T0300Z-yumemita-cast-posts.json",
  "research-batches/2026-08-13T0330Z-season-official-week-backfill.json",
  "research-batches/2026-08-12T0530Z-season-social-important.json",
  "research-batches/2026-08-12T0519Z-yumemita-project-activities.json",
];
const sources = await Promise.all(sourcePaths.map(async (path) => (
  (await Bun.file(path).json()) as ResearchBatch
)));

function select(sourceItemId: string): BatchObservation {
  for (const source of sources) {
    const row = source.observations.find((item) => item.sourceItemId === sourceItemId);
    if (row) return structuredClone(row);
  }
  throw new Error(`missing source observation ${sourceItemId}`);
}

function repair(sourceItemId: string, title: string, summary: string, translation?: string) {
  const row = select(sourceItemId);
  row.title = title;
  row.excerpt = summary;
  if (translation !== undefined) row.publicTranslation = translation;
  row.metadata = {
    ...(row.metadata ?? {}),
    researchMode: "repair",
    correctionReason: "canonicalize_historical_public_entity_names",
  };
  for (const candidate of row.candidates) {
    candidate.title = title;
    candidate.summary = summary;
    candidate.review = {
      decision: "publish",
      confidence: 0.99,
      reasons: ["按数据库关联资源使用规范作品、人名或角色名", "保留同一来源与稳定平台对象 ID"],
      model: "local-codex",
      promptVersion: "canonical-name-repair@3",
    };
  }
  return row;
}

const observations = [
  repair(
    "2088098288964890688",
    "中山真奈加、前田佳织里将出席全国小学生躲避球锦标赛",
    "中山真奈加与前田佳织里将于 8 月 16 日出席高崎体育馆的全国小学生躲避球锦标赛，现场还会发放《斗球女弹子》团扇。",
    "《斗球女弹子》将在本周末（8月16日）于高崎体育馆举行的夏季全国小学生躲避球锦标赛亮相。弹子役中山真奈加与珍子役前田佳织里将出席开幕式、午间抽奖会和闭幕式，现场还会发放作品团扇。",
  ),
  repair(
    "2087540638493622331",
    "镰仓有那回顾《向日葵广播局》第 6 回",
    "饰演酒匂雫的镰仓有那感谢观众收听第 6 回广播，并分享使用动画官网相机功能制作的照片。",
  ),
  repair(
    "2087489326288650653",
    "峰月律回顾《ゆめ∞みたラジオ》第 7 回",
    "峰月律发帖谈及本期《ゆめ∞みたラジオ》由她与千石由乃搭档出演，两人聊得很热闹，并晒出配图笑称“这表情好像宇宙猫”。",
  ),
  repair(
    "2087479204325797961",
    "《向日葵马戏团》声优音声节目《向日葵广播局》第 6 回开播",
    "每周出演声优的直播音声节目《向日葵广播局》第 6 回于 8 月 12 日 20:30 开播，本回由野田朋花、镰仓有那、岩桥由佳出演，YouTube 与 X Space 同步播出。",
  ),
  repair(
    "2087388700011643123",
    "音响监督谈《魔法少女奈叶 EXCEEDS》第 6 话的关系情感",
    "ハマノカズゾウ在《魔法少女奈叶 EXCEEDS》第 6 话播后评论中谈到，两位角色彼此珍视却隐藏内心确信所形成的苦涩感。",
  ),
  repair(
    "2087373520787435951",
    "《ゆめ∞みたラジオ》第 7 回上线",
    "峰月律与千石由乃出演本期官方广播，继续介绍《BanG Dream! YUME∞MITA》的动画与企划内容。",
  ),
  repair(
    "2087109266415206871",
    "《碧蓝航线：微速前行！第二季》客串舰船介绍：新泽西（富田美忧配音）",
    "《碧蓝航线：微速前行！第二季》官方介绍客串舰船新泽西（CV：富田美忧）：乐观爽朗的衣阿华级战列舰，自称“最大最强的黑色巨龙”，也确实拥有相称的战力。",
  ),
  repair(
    "2087101727413801162",
    "《碧蓝航线：微速前行！第二季》客串舰船介绍：腓特烈大帝（生天目仁美配音）",
    "《碧蓝航线：微速前行！第二季》官方介绍客串舰船腓特烈大帝（CV：生天目仁美）：奏响壮丽黑铁交响、备受各阵营瞩目，在指挥官面前却会显露“暗之圣母”般的一面。",
  ),
  repair(
    "2087094166094315810",
    "《碧蓝航线：微速前行！第二季》客串舰船介绍：岛风（早见沙织配音）",
    "《碧蓝航线：微速前行！第二季》官方介绍客串舰船岛风（CV：早见沙织）：热血而偶尔犯迷糊的最速旋风，想法容易跑偏，却总能在危机中转化为大胜利的机灵。",
  ),
  repair(
    "2087086617899237783",
    "《碧蓝航线：微速前行！第二季》客串舰船介绍：骏河（远藤绫配音）",
    "《碧蓝航线：微速前行！第二季》官方介绍客串舰船骏河（CV：远藤绫）：礼貌认真、性格稳重，面对指挥官时也尽量不引人注目。",
  ),
  repair(
    "2087014813168005332",
    "《魔法少女奈叶 EXCEEDS》第 1—5 话开启暑期限定循环配信",
    "YouTube 暑期限定直播已开启，内容包含《魔法少女奈叶 EXCEEDS》第 1—5 话及系列剧场版。",
  ),
  repair(
    "2086754431995875492",
    "梦限大Mewtype 第 5 张单曲发行纪念 1on1 活动开放报名",
    "梦限大Mewtype 为《これはぼくたちの生存のあらすじ》举办 1on1 在线谈话活动，五位企划成员均开放预约。",
  ),
];

type MediaAsset = {
  r2Key: string;
  sourceUrl: string;
  contentHash: string;
  byteSize: number;
  altText: string;
};

function observation(sourceItemId: string) {
  const row = observations.find((item) => item.sourceItemId === sourceItemId);
  if (!row) throw new Error(`missing repaired observation ${sourceItemId}`);
  return row;
}

function document(sourceItemId: string, publicText: string, publicTranslation: string) {
  const row = observation(sourceItemId);
  row.publicText = publicText;
  row.publicTranslation = publicTranslation;
  row.metadata = { ...(row.metadata ?? {}), publicTextMode: "full_with_translation" };
  return row;
}

function noMedia(sourceItemId: string) {
  const row = observation(sourceItemId);
  row.mediaDisposition = "none";
  delete row.mediaDispositionReason;
  return row;
}

function attachMedia(
  sourceItemId: string,
  mediaTitle: string,
  creatorName: string,
  asset: MediaAsset,
) {
  const row = observation(sourceItemId);
  const candidate = row.candidates[0];
  candidate.media = {
    contentClass: "official_art",
    title: mediaTitle,
    creatorName,
    creatorUrl: row.canonicalUrl.replace(/\/status\/.+$/u, ""),
    originalUrl: row.canonicalUrl,
    previewUrl: `https://r2.i-yuri.com/${asset.r2Key}`,
    presentationMode: "mirrored_with_permission",
    safetyRating: "safe",
    spoilerLevel: candidate.spoilerLevel,
    rightsNote: "原作者或动画官方账号公开的原帖媒体；未见禁止转载标注，保留署名、来源与撤回路径。",
    assets: [{
      ...asset,
      mimeType: "image/jpeg",
      sortOrder: 0,
      variant: "original",
      rightsStatus: "official_promo_reviewed",
      rightsBasis: "原作者或动画官方账号公开的原帖媒体；未见禁止转载标注，保留署名、来源与撤回路径。",
    }],
  };
  row.mediaDisposition = "attached";
  delete row.mediaDispositionReason;
  return row;
}

document(
  "2087540638493622331",
  "「ひまわりの放送局」ご視聴いただきありがとうございました！\n今回もゆかちゃんとお洋服が似てて運命感じちゃう…\n私も公式サイトのカメラでデコってみましたー！\n放送局もアニメも引き続き宜しくお願いします！！\n#グロウアップショウ",
  "感谢大家收听《向日葵广播局》！\n这次我和由佳的衣服也很像，感觉像命中注定……\n我也用官网的相机功能装饰了照片！\n今后也请继续支持广播节目和动画！！\n#向日葵马戏团",
);
attachMedia("2087540638493622331", "镰仓有那回顾《向日葵广播局》第 6 回配图", "镰仓有那", {
  r2Key: "yuri/grow-up-show/2026-08-12/0cb9136f224c5ced-kamakura-radio.jpg",
  sourceUrl: "https://pbs.twimg.com/media/HPhvJVsaMAA5B9O?format=jpg&name=orig",
  contentHash: "0cb9136f224c5cedc7dc2263b7f619bb458663fd2fbb2a8451aa97a3c4a730e1",
  byteSize: 173186,
  altText: "镰仓有那使用《向日葵马戏团》官网相机功能制作的照片",
});

document(
  "2087489326288650653",
  "今回の #ゆめみたラジオ は、\nユノりつ回でした！\nふたりでわちゃわちゃ話してきました\nあと写真のこの顔、何すぎる、宇宙猫かもしれない",
  "本期 #ゆめみたラジオ 是由乃与律搭档的一回！\n我们两个人热热闹闹地聊了很多。\n还有照片里这个表情到底是什么，可能是宇宙猫。",
);
noMedia("2087489326288650653");

document(
  "2087479204325797961",
  "ひまわりの放送局\nこの後20:30スタート！\n\n毎週キャストが出演！\n生配信でお届けする音声番組\n\n本日の出演は\n#野田朋花 さん\n#鎌倉有那 さん\n#岩橋由佳 さん\n\n#グロウアップショウ",
  "《向日葵广播局》稍后 20:30 开始！\n\n每周都有声优出演，以直播形式带来的音声节目。\n\n本日出演：野田朋花、镰仓有那、岩桥由佳。\n\n#向日葵马戏团",
);
noMedia("2087479204325797961");

document(
  "2087388700011643123",
  "/／\n#なのはEXGV スタッフコメント到着！\n\\＼\n\n＃06 「蔵木エイジと篠宮マナ／陽光」\n放送後のスタッフコメントが到着\n\n音響監督／ハマノカズゾウさん\nお互いが大切に思っているのに、自分の確信の部分を隠して\n時間を過ごすせつなさに心がキュッとなります。\n\n▾全文はこちら▾",
  "#魔法少女奈叶EXCEEDS Staff 评论已送达！\n\n第 06 话《蔵木エイジ与篠宮マナ／阳光》播出后的 Staff 评论。\n\n音响监督／ハマノカズゾウ：\n明明彼此都很珍视对方，却隐藏自己确信的部分，一同度过时光的苦涩感令人心头一紧。\n\n完整内容请见原帖链接。",
);
attachMedia("2087388700011643123", "第 6 话音响监督评论图", "《魔法少女奈叶 EXCEEDS》动画官方", {
  r2Key: "yuri/nanoha-exceeds/2026-08-11/7c19c87c74cd2ee9-staff-comment.jpg",
  sourceUrl: "https://pbs.twimg.com/media/HPfk9WibEAAEfHs?format=jpg&name=orig",
  contentHash: "7c19c87c74cd2ee968c2b06993be349986538fc3726fb8fb6d81ce13e3bb23fa",
  byteSize: 177035,
  altText: "《魔法少女奈叶 EXCEEDS》第 6 话音响监督评论",
});

document(
  "2087373520787435951",
  "＼本日配信／\n\n夢限大みゅーたいぷの\n「ゆめ∞みたラジオ」#7\n\n峰月律と千石ユノが出演\n\n#アニメゆめみた の魅力をお届けしますので、ぜひご覧ください！\n\n#バンドリ",
  "今天上线。\n\n梦限大Mewtype 的《ゆめ∞みたラジオ》第 7 回由峰月律与千石由乃出演。\n\n节目将介绍《BanG Dream! YUME∞MITA》的魅力，敬请收听！\n\n#バンドリ",
);
noMedia("2087373520787435951");

const azurAssets = [
  ["2087109266415206871", "新泽西", "ニュージャージー", "富田美憂", "a80006d38ea350b3-new-jersey.jpg", "HPW_ccIaQAAjOP5", "a80006d38ea350b3b936b66a9e7294130e7034ae9ac83ba1a5ea790c3c7dcda5", 650993, "ノリよくカッコよくポジティブなアイオワ級戦艦。『最大最強のブラックドラゴン』……と本人が冗談半分で自称しているが、それに相応しい戦力を備えている。", "乐观爽朗的衣阿华级战列舰，自称“最大最强的黑色巨龙”，也确实拥有相称的战力。"],
  ["2087101727413801162", "腓特烈大帝", "フリードリヒ・デア・グローセ", "生天目仁美", "ad1caebceb2a503f-friedrich.jpg", "HPW_TJPakAA5fWP", "ad1caebceb2a503f2eca9ef9c9fa1f8a8f4711c8265b917f5b647116dcb2be2f", 1179939, "壮麗なる黒鉄の交響を奏でるその威容からか、各陣営から一目置かれている一方、指揮官の前ではまるで『闇の聖母』のような一面を見せることもある。", "奏响壮丽黑铁交响、备受各阵营瞩目，在指挥官面前却会显露“暗之圣母”般的一面。"],
  ["2087094166094315810", "岛风", "島風", "早見沙織", "d1214eac726f4a07-shimakaze.jpg", "HPW_IlUaAAEGqCx", "d1214eac726f4a07f62814d0bd0d162f20941f3a9f9bb34233da5b856e743c65", 1347342, "熱い心を持ち、ときにドジるも主役級の活躍をする最速のつむじ風。思い込みが激しく、事を斜め上に運んでしまうことが多いが、ピンチを大勝利へと転じさせる機転も。", "热血而偶尔犯迷糊的最速旋风，想法容易跑偏，却总能在危机中转化为大胜利的机灵。"],
  ["2087086617899237783", "骏河", "駿河", "遠藤綾", "9568b229321ba6a1-suruga.jpg", "HPW_ATUawAEuV3c", "9568b229321ba6a1ce2ae329726afce2dc4b1ef79ae25cdd9f67d3a951c49970", 1364159, "礼儀正しく、しっかりとした性格の持ち主。指揮官相手でも近づき難い雰囲気を発し、極力目立たないようにしている。", "礼貌认真、性格稳重，面对指挥官时也尽量不引人注目。"],
] as const;
for (const [sourceItemId, shipZh, shipJa, cv, filename, mediaId, hash, byteSize, ja, zh] of azurAssets) {
  document(
    sourceItemId,
    `◤ゲスト艦船紹介◢\n\n◆${shipJa}（CV：${cv}）\n${ja}\n\nhttps://2nd.azurlane-bisoku.jp/character\n#びそくアニメ`,
    `客串舰船介绍\n\n◆${shipZh}（CV：${observation(sourceItemId).excerpt.match(/CV：([^）]+)/u)?.[1] ?? cv}）\n${zh}\n\nhttps://2nd.azurlane-bisoku.jp/character\n#びそくアニメ`,
  );
  attachMedia(sourceItemId, `${shipZh}客串舰船介绍图`, "《碧蓝航线：微速前行！第二季》动画官方", {
    r2Key: `yuri/azurlane-bisoku-2/2026-08-11/${filename}`,
    sourceUrl: `https://pbs.twimg.com/media/${mediaId}?format=jpg&name=orig`,
    contentHash: hash,
    byteSize,
    altText: `《碧蓝航线：微速前行！第二季》客串舰船${shipZh}介绍图`,
  });
}

document(
  "2087014813168005332",
  "お盆期間限定\n\nループ配信はじめました\n\nhttps://youtube.com/live/c_E-yjZ6fSo\n\n配信番組詳細は概要欄をご確認ください\n#なのはEXGV #なのは #nanoha",
  "盂兰盆节期间限定循环配信现已开始。\n\nhttps://youtube.com/live/c_E-yjZ6fSo\n\n节目详情请查看视频简介。\n#魔法少女奈叶EXCEEDS #なのは #nanoha",
);
noMedia("2087014813168005332");

document(
  "2086754431995875492",
  "／\n1on1オンライントークイベント\n受付開始\n＼\n\n夢限大みゅーたいぷ 5th Single\n「これはぼくたちの生存のあらすじ」リリース記念\n1on1 オンライントークイベント\n\nお申し込みはこちら\nhttps://talkport.com/a/2241/2758\n\nこの機会をお見逃しなく\n\n#バンドリ #ゆめみた",
  "1on1 在线谈话活动开始报名。\n\n梦限大Mewtype 第 5 张单曲《これはぼくたちの生存のあらすじ》发行纪念 1on1 在线谈话活动。\n\n报名入口：https://talkport.com/a/2241/2758\n\n请勿错过这次机会。\n\n#バンドリ #ゆめみた",
);
attachMedia("2086754431995875492", "第 5 张单曲发行纪念 1on1 活动图", "梦限大Mewtype 官方", {
  r2Key: "yuri/yumemita/2026-08-10/3e2dd33e5364093d-fifth-single-event.jpg",
  sourceUrl: "https://pbs.twimg.com/media/HPVrDqpbYAAUyoX?format=jpg&name=orig",
  contentHash: "3e2dd33e5364093d1b58d1c9fcacd456d8fb839ab9fcccabd0e77bdfb4dff144",
  byteSize: 1063283,
  altText: "梦限大Mewtype 第 5 张单曲发行纪念 1on1 在线谈话活动图",
});

const dodge = observation("2088098288964890688");
dodge.mediaDisposition = "unavailable";
dodge.mediaDispositionReason = "该历史记录已有公开媒体关系，但旧 batch 未保存可重复验证的上游媒体直链；本批保留现有媒体，不伪造 sourceUrl 或重复上传。";
dodge.metadata = { ...(dodge.metadata ?? {}), publicTextMode: "full_with_translation" };

const output: ResearchBatch = {
  schemaVersion: "1",
  batchId: "2026-08-15T0855Z-canonical-name-repair-part-3",
  createdAt: "2026-08-15T08:55:00Z",
  agent: "codex/yuri-season-research@5",
  scope: "repair: remaining canonical work, person, and character names in current feed",
  note: "Repairs all remaining known alias conflicts in the current 80-item feed without fabricating untranslated names or substitute media.",
  observations,
};

const path = "research-batches/2026-08-15T0855Z-canonical-name-repair-part-3.json";
await Bun.write(path, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(JSON.stringify({ path, observations: observations.length }, null, 2));
