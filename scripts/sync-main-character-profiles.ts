import type { AdminAnimeResources, AdminCastCredit, CastWrite } from "@/domain";
import { rpcData } from "@/lib/rpc";
import { adminApi, fetchAdminResources } from "./lib/admin-dashboard";

export type CharacterRepair = {
  animeId: string;
  characterId: string;
  portraitUrl: string;
  portraitSourceUrl: string;
  characterProfile?: string;
  profileSourceUrl?: string;
};

const magRoot = "https://magilumiere-pr.com/2nd/wp-content/themes/f76ff52d9944/static/character";
const nanoRoot = "https://www.nanoha.com/EXGV/assets/images/character";
const dodgeRoot = "https://dodge-danko.com/assets/webp/sp/character";

export const mainCharacterRepairs: CharacterRepair[] = [
  {
    animeId: "anime-taiari", characterId: "char-aya",
    portraitUrl: "https://taiari-anime.com/assets/img/character/select_chara1.png",
    portraitSourceUrl: "https://taiari-anime.com/#character",
    characterProfile: "向往千金小姐生活而进入黑美女子学院的普通家庭少女。小学时便接触格斗游戏，热爱到手上磨出了摇杆茧。",
    profileSourceUrl: "https://taiari-anime.com/character/chara1.html",
  },
  {
    animeId: "anime-taiari", characterId: "char-mio",
    portraitUrl: "https://taiari-anime.com/assets/img/character/select_chara2.png",
    portraitSourceUrl: "https://taiari-anime.com/#character",
    characterProfile: "因美貌与优雅举止被称作“白百合大人”，其实是极度热衷格斗游戏、会毫不客气追求胜利的玩家；学习则很不擅长。",
    profileSourceUrl: "https://taiari-anime.com/character/chara2.html",
  },
  {
    animeId: "anime-taiari", characterId: "char-yu",
    portraitUrl: "https://taiari-anime.com/assets/img/character/select_chara3.png",
    portraitSourceUrl: "https://taiari-anime.com/#character",
    characterProfile: "喜欢热闹的气氛制造者，也是宿舍自治组织“寮务委员会”的成员。自小学起便喜欢格斗游戏，为和绫、美绪、珠树成为朋友而越陷越深。",
    profileSourceUrl: "https://taiari-anime.com/character/chara3.html",
  },
  {
    animeId: "anime-taiari", characterId: "char-tamaki",
    portraitUrl: "https://taiari-anime.com/assets/img/character/select_chara4.png",
    portraitSourceUrl: "https://taiari-anime.com/#character",
    characterProfile: "负责宿舍四楼的寮务委员，严守规则、好胜且勤奋，会为了胜利不断练习。其实因憧憬某个人而一直在房间里偷偷玩格斗游戏。",
    profileSourceUrl: "https://taiari-anime.com/character/chara4.html",
  },
  {
    animeId: "anime-taiari", characterId: "char-arisa",
    portraitUrl: "https://taiari-anime.com/assets/img/character/select_chara5.png",
    portraitSourceUrl: "https://taiari-anime.com/#character",
    characterProfile: "实力不逊职业选手的小学生玩家，不允许自己在格斗游戏上妥协。虽然毒舌，比赛中却能冷静判断并一心求胜。",
    profileSourceUrl: "https://taiari-anime.com/character/chara5.html",
  },
  {
    animeId: "anime-taiari", characterId: "char-hana",
    portraitUrl: "https://taiari-anime.com/assets/img/character/select_chara7.png",
    portraitSourceUrl: "https://taiari-anime.com/#character",
    characterProfile: "黑美女子学院高中部寮务委员会副会长、珠树的姐姐。是在福冈游戏咖啡厅磨炼出的格斗游戏高手，被亚里沙称作“染血的马卡龙”。",
    profileSourceUrl: "https://taiari-anime.com/character/chara7.html",
  },

  ...[
    ["char-sheena", "chara1", "希娜", "战争孤儿，被培养为兵器的少女。讨厌争斗却不得不接受训练，在学校里过着随时可能迎来死亡的日常。"],
    ["char-mimi", "chara2", "咪咪", "某天突然出现在希娜面前的神秘少女。外表年幼可爱、性格天真开朗，却拥有被称作“学校秘密兵器”的强大战斗力。"],
    ["char-lizzy", "chara3", "莉兹", "希娜的同班同学。重视伙伴，也很关心不擅长战斗的希娜；正义感强，却也有笨拙的一面。"],
    ["char-ali", "chara4", "阿里", "希娜的同班同学。性格温和，平时会温柔陪伴赛兰，偶尔也会用直白的话语让周围人吃惊。"],
  ].map(([characterId, number, _label, characterProfile]) => ({
    animeId: "anime-kimishinu",
    characterId,
    portraitUrl: `https://kimishinu-anime.com/assets/img/character/${number}_thumb.webp`,
    portraitSourceUrl: "https://kimishinu-anime.com/character/",
    characterProfile,
    profileSourceUrl: "https://kimishinu-anime.com/character/",
  })),

  {
    animeId: "anime-goodbye-lara", characterId: "char-lara-lara",
    portraitUrl: "https://goodbyelara.com/assets/img/character/chara1_thumb1.png",
    portraitSourceUrl: "https://goodbyelara.com/#character",
  },
  {
    animeId: "anime-goodbye-lara", characterId: "char-lara-mari",
    portraitUrl: "https://goodbyelara.com/assets/img/character/chara2_thumb1.png",
    portraitSourceUrl: "https://goodbyelara.com/#character",
  },

  ...[
    ["char-javelin", "char-face1-2466c144.webp", "皇家所属的 J 级驱逐舰，开朗坦率。她一边在港区学园上学，一边尽情享受和大家热闹相处的生活，偶尔会陷入自己的想象。"],
    ["char-ayanami", "char-face2-90d87e11.webp", "重樱所属的特型驱逐舰，话不多、原本一心战斗且不擅长社交；在港区受同伴影响后沉迷上了游戏。"],
    ["char-laffey", "char-face3-b2c2dde5.webp", "白鹰所属的本森级驱逐舰，戴着兔耳、总是一副困倦模样。看起来情绪低沉，却也会突然做出出人意料的行动。"],
    ["char-z23", "char-face4-b091d396.webp", "铁血所属的 1936A 型驱逐舰，勤奋好学的优等生，也是大家喜爱的“尼米老师”。性格认真，常因放不下同伴而卷入麻烦。"],
  ].map(([characterId, filename, characterProfile]) => ({
    animeId: "anime-azurlane-bisoku-2",
    characterId,
    portraitUrl: `https://webusstatic.yo-star.com/azurlane-jp/azurlane-jp-bisoku2-h5/prod/azurlanejpbisuku2h5/assets/${filename}`,
    portraitSourceUrl: "https://2nd.azurlane-bisoku.jp/character",
    characterProfile,
    profileSourceUrl: "https://2nd.azurlane-bisoku.jp/character",
  })),

  ...[
    ["char-dodge-danko", "ichigekidanko", "就读于新球川小中一贯校、无论何时都全力以赴的小学生。为复活因父辈接连受伤而废部的闘球部四处奔走，继承了父亲一击弹平的不屈斗志与才能。"],
    ["char-dodge-chinko", "kobotokechinko", "弹子的青梅竹马和理解者，也是闘久寺住持小佛珍念的女儿。擅长闘球技巧，甚至能复现只看过一次的对手必杀技。"],
    ["char-dodge-mochiko", "etaimochiko", "性格温柔、主张和平的中等部学生，拥有极其柔软的身体。她是闘球部的防守核心，也总会留意热血过头的队友。"],
    ["char-dodge-susan", "susancanon", "在美国长大的中等部学生，运动万能且力量惊人。酷爱胜负，与弹子认真交手后加入闘球部，和望知子有着深厚友情。"],
    ["char-dodge-hanii", "otohanahoney", "不善交际的初等部四年级学生，其实渴望和同龄人交朋友。虽然不擅长运动，却会用无人机与 AI 等新技术迷惑强敌。"],
    ["char-dodge-hako", "mikasahako", "正式成立后的球川闘球部队长，能在不看对手的情况下判断投球时机和方向。身材高挑却有胆小的一面，与副队长颯美友情深厚。"],
    ["char-dodge-hayami", "hiurahayami", "球川闘球部副队长，和箱一起重建名门球队。速度出众，会从死角发动“疾风射球”，也有非常结实的身体。"],
  ].map(([characterId, slug, characterProfile]) => ({
    animeId: "anime-dodge-danko",
    characterId,
    portraitUrl: `${dodgeRoot}/${slug}/character-${slug}.webp`,
    portraitSourceUrl: "https://dodge-danko.com/#character_introduce",
    characterProfile,
    profileSourceUrl: "https://dodge-danko.com/#character_introduce",
  })),

  ...[
    ["char-draw-ai", 1, "住在伊豆大岛、非常喜欢漫画的高中一年级生，是☆野零作品《机器人太与波可太》的忠实读者。"],
    ["char-draw-rei", 2, "相就读高中的国语教师。会对热爱漫画的相进行严格“指导”，但其实另有内情。"],
    ["char-draw-kokoro", 3, "擅长画画的相的同班同学，同时加入美术部和与相一起创办的漫画研究会。"],
    ["char-draw-sachi", 4, "相的同班同学，希望建立舒适的社团活动室，因此和相一起成立漫画研究会。"],
    ["char-draw-hikaru", 5, "搬到伊豆大岛的高中一年级生，同时以实力派业余漫画家的身份活动。"],
  ].map(([characterId, number, characterProfile]) => ({
    animeId: "anime-korekaite",
    characterId: String(characterId),
    portraitUrl: `https://www.vap.co.jp/korekaite-shine/assets/img/comment-cast-${number}-ico.png`,
    portraitSourceUrl: "https://www.vap.co.jp/korekaite-shine/#character",
    characterProfile: String(characterProfile),
    profileSourceUrl: "https://www.vap.co.jp/korekaite-shine/#character",
  })),

  ...[
    ["char-magilumiere-kana", "01", "株式会社魔法光的新人魔法少女，拥有出众记忆力，也不怕下功夫准备。求职时因性格内向屡屡受挫，入职后被社长重本发现了魔法少女资质。"],
    ["char-magilumiere-hitomi", "02", "株式会社魔法光的魔法少女，衣着随意、性格豪爽，拥有出色的身体能力和天才般的感性。很会照顾人，也会向佳奈传授魔法少女的职业心得。"],
    ["char-magilumiere-mei", "06", "行业最大企业阿斯特株式会社的王牌魔法少女，交付数量居公司首位。像计算机一样精密，以效率、稳定和最大成果为准则执行任务。"],
    ["char-magilumiere-lily", "08", "大型化妆品厂商美弥古堂的魔法少女，作为公司门面体现美丽，并希望向社会传达魔法少女是一份美好工作。与魔法光合作时担任佳奈的搭档。"],
    ["char-magilumiere-akane", "12", "中型企业阿普达株式会社的魔法少女，成绩优异、事业心强且工作勤奋。为评估新技术而被派往魔法光，在佳奈指导下参加实地研修。"],
  ].map(([characterId, number, characterProfile]) => ({
    animeId: "anime-magilumiere-2",
    characterId,
    portraitUrl: `${magRoot}/${number}/icon.webp`,
    portraitSourceUrl: "https://magilumiere-pr.com/character/",
    characterProfile,
    profileSourceUrl: "https://magilumiere-pr.com/character/",
  })),

  ...[
    ["char-nanoha-shiina", "shiina", "17 岁的高中二年级生，也是 EXCEEDS 驱除队员。继承“魔人”之力后加入组织，负责驱除威胁世界的危险生物“侵略种”。"],
    ["char-nanoha-towa", "towa", "18 岁的高中三年级生，外表安静温柔，真实身份却是追查魔人化药物组织与仇敌的“魔人猎手”。她和希伊娜在不知道彼此真实身份的情况下成为挚友。"],
    ["char-nanoha", "nanoha", "13 岁的 EXCEEDS 年轻调查官和 S 级魔导师，在侵略种灾害最前线进行调查，必要时也负责驱除。性格开朗，与同僚希伊娜彼此信赖。"],
    ["char-fate", "fate", "13 岁的 EXCEEDS 执务官和 S 级魔导师，本职以内勤为主，也会参加现场调查与驱除。性格温柔，是高町奈叶的挚友。"],
    ["char-hayate", "hayate", "EXCEEDS 创始人兼统合本部总督，驻留极东支局并指挥各国支局。她看中希伊娜的实力并邀请其加入组织。"],
    ["char-rein", "rein", "EXCEEDS 事务总长，也是八神疾风的女儿。她通过维持组织顺畅运作，在幕后支援一线工作人员。"],
    ["char-luke", "luke", "43 岁的 EXCEEDS 极东支局局长，负责统筹支局并辅助八神总督。"],
    ["char-setsuna", "setsuna", "11 岁的小学五年级生、希伊娜的妹妹。擅长家务和照料菜园，学习也很优秀，曾与姐姐作为彼此唯一的家人相互扶持生活。"],
  ].map(([characterId, slug, characterProfile]) => ({
    animeId: "anime-nanoha-exceeds",
    characterId,
    portraitUrl: `${nanoRoot}/thumb_${slug}.webp`,
    portraitSourceUrl: `https://www.nanoha.com/EXGV/character/${slug}.html`,
    characterProfile,
    profileSourceUrl: `https://www.nanoha.com/EXGV/character/${slug}.html`,
  })),
];

function castWrite(cast: AdminCastCredit, repair: CharacterRepair): CastWrite {
  return {
    personId: cast.personId,
    characterName: cast.characterName,
    characterNameNative: cast.characterNameNative,
    nameSourceUrl: cast.nameSourceUrl,
    characterProfile: cast.characterProfile || repair.characterProfile || null,
    profileSourceUrl: repair.characterProfile ? repair.profileSourceUrl ?? null : cast.profileSourceUrl,
    portraitUrl: cast.portraitUrl || repair.portraitUrl,
    portraitSourceUrl: cast.portraitSourceUrl || repair.portraitSourceUrl,
    isMainGroup: cast.isMainGroup,
    personName: cast.personName,
    personNameNative: cast.personNameNative,
    birthdayMonth: cast.birthdayMonth,
    birthdayDay: cast.birthdayDay,
    birthdayYear: cast.birthdayYear,
    birthdayTimezone: cast.birthdayTimezone,
    birthdaySourceUrl: cast.birthdaySourceUrl,
    birthdayVerified: cast.birthdayVerified,
    sortOrder: cast.sortOrder,
  };
}

async function verifyPortraits(): Promise<void> {
  const unique = [...new Set(mainCharacterRepairs.map((repair) => repair.portraitUrl))];
  const results = await Promise.all(unique.map(async (url) => {
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    return {
      url,
      status: response.status,
      type: response.headers.get("content-type") ?? "",
      hasImageSignature: isPng || isJpeg || isWebp,
    };
  }));
  const invalid = results.filter((result) => result.status !== 200
    || (!result.type.startsWith("image/") && !result.hasImageSignature));
  if (invalid.length > 0) throw new Error(`Invalid portrait URLs: ${JSON.stringify(invalid, null, 2)}`);
}

async function patchCast(animeId: string, cast: AdminCastCredit, repair: CharacterRepair): Promise<void> {
  await rpcData(adminApi().api.admin.anime[":animeId"].resources[":kind"][":id"].$patch({
    param: { animeId, kind: "cast", id: cast.id },
    json: castWrite(cast, repair),
  }));
}

export async function syncMainCharacterProfiles(apply: boolean): Promise<void> {
  const keys = new Set<string>();
  for (const repair of mainCharacterRepairs) {
    const key = `${repair.animeId}/${repair.characterId}`;
    if (keys.has(key)) throw new Error(`Duplicate repair: ${key}`);
    keys.add(key);
  }
  await verifyPortraits();

  const byAnime = new Map<string, CharacterRepair[]>();
  for (const repair of mainCharacterRepairs) {
    const values = byAnime.get(repair.animeId) ?? [];
    values.push(repair);
    byAnime.set(repair.animeId, values);
  }
  const summary = { targets: mainCharacterRepairs.length, portraitsVerified: mainCharacterRepairs.length, changed: 0, unchanged: 0 };

  for (const [animeId, repairs] of byAnime) {
    const resources = await fetchAdminResources(animeId);
    for (const repair of repairs) {
      const cast = resources.cast.find((item) => item.characterId === repair.characterId);
      if (!cast) throw new Error(`Missing cast record: ${animeId}/${repair.characterId}`);
      if (!cast.isMainGroup) throw new Error(`Target is no longer main group: ${animeId}/${repair.characterId}`);
      const next = castWrite(cast, repair);
      const changed = next.portraitUrl !== cast.portraitUrl
        || next.portraitSourceUrl !== cast.portraitSourceUrl
        || next.characterProfile !== cast.characterProfile
        || next.profileSourceUrl !== cast.profileSourceUrl;
      if (!changed) {
        summary.unchanged += 1;
        continue;
      }
      console.log(`${apply ? "updating" : "would update"}: ${animeId} / ${cast.characterName}`);
      if (apply) await patchCast(animeId, cast, repair);
      summary.changed += 1;
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...summary }, null, 2));
}

if (import.meta.main) await syncMainCharacterProfiles(process.argv.includes("--apply"));
