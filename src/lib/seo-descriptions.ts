import type { AnimeDetail, CalendarResponse, CatalogResponse, PublicationDetailResponse, SeasonsResponse } from "@/domain";
import { yuriDisplayLabel } from "./format";

export function seasonName(label: string): string {
  return label.replace(/^(\d{4})\s*([春夏秋冬])$/u, "$1年$2季");
}

function synopsisExcerpt(text: string): string {
  const characters = Array.from(text.replace(/\s+/gu, " ").trim());
  if (characters.length <= 90) return characters.join("");
  const excerpt = characters.slice(0, 90).join("");
  const sentenceEnd = Math.max(excerpt.lastIndexOf("。"), excerpt.lastIndexOf("！"), excerpt.lastIndexOf("？"));
  return sentenceEnd >= 40 ? excerpt.slice(0, sentenceEnd + 1) : `${excerpt.replace(/[，、；：\s]+$/u, "")}…`;
}

export function catalogDescription(catalog: CatalogResponse, home = false): string {
  const season = seasonName(catalog.season.label);
  const titles = catalog.anime.slice(0, 2).map((anime) => `《${anime.titleZh}》`).join("、");
  return [
    home ? "YuriSeason 为百合动画爱好者整理当季新番与追番情报。" : `${season}百合动画片单。`,
    catalog.anime.length
      ? `${home ? season : "本季"}已收录 ${catalog.anime.length} 部作品，包括${titles}。`
      : `${season}片单整理中。`,
    "查看百合、关系向、女性群像与观察中标签，结合中日文片名、放送时间和作品资料选择想追的动画。",
    home ? "还可追踪官方消息、声优与制作人员动态，并回到原始来源查看详情。" : "点击作品可查看简介、角色与声优、制作人员及相关情报。",
  ].join("");
}

export function animeDescription(anime: AnimeDetail): string {
  const facts = [
    `分类：${yuriDisplayLabel(anime.yuriKind, anime.yuriStatus)}`,
    anime.studio ? `动画制作：${anime.studio}` : null,
    anime.episodeCount ? `${anime.episodeCount} 话` : null,
  ].filter(Boolean).join("；");
  return [
    `《${anime.titleZh}》${anime.titleJa !== anime.titleZh ? `（${anime.titleJa}）` : ""}。`,
    `${facts}。`,
    synopsisExcerpt(anime.synopsis),
    " 查看放送安排、角色与声优、制作人员和相关情报。",
  ].join("");
}

export function publicationDescription({ item, document }: PublicationDetailResponse): string {
  const summary = item.summary.trim() || item.title;
  const work = item.animeTitle && !summary.includes(item.animeTitle) ? `《${item.animeTitle}》：` : "";
  const content = document?.publicText
    ? document.publicTranslation ? "附原文与中文翻译，可查看原始出处。" : "附原文内容与原始出处。"
    : "可查看原始出处与相关情报。";
  return `${work}${summary}${/[。！？!?…]$/u.test(summary) ? "" : "。"}来源：${item.sourceName}。${content}`;
}

export function seasonsDescription(data: SeasonsResponse): string {
  const labels = data.seasons.slice(0, 3).map((season) => seasonName(season.label)).join("、");
  return `${labels ? `浏览${labels}等已整理季度的百合动画片单。` : "按年份与季度浏览百合动画片单。"}查看各季收录数量与季度日期，从季度列表进入作品页，了解动画简介、百合分类、放送安排、角色与声优。既可查找当季新番，也可回看已收录的季度。`;
}

export function calendarDescription(data: CalendarResponse): string {
  const count = new Set(data.entries.map((entry) => entry.animeId)).size;
  return `${seasonName(data.season.label)}百合动画每周放送表，${count ? `已整理 ${count} 部作品的播出安排` : "播出安排整理中"}。按周一至周日查看日本放送日、播出时间、平台与集数进度；时间同时提供本地时区换算。还可查找角色生日、直播、发售与相关活动，查看时间和来源。`;
}
