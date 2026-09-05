import type { PublicationDetailResponse } from "@/domain";
import { publicationDescription } from "./seo-descriptions";

export const SITE_ORIGIN = "https://i-yuri.com";
export const SITE_NAME = "YuriSeason";
export const SITE_DESCRIPTION = "YuriSeason 为百合动画爱好者整理季度片单、每周放送表与最新情报。结合百合、关系向、女性群像和观察中标签选择想追的作品，查看角色与声优、制作人员、主题曲及官方动态，每条情报都可回到原始来源。";

export function pageUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).href;
}

export function seoHead({ title, description = SITE_DESCRIPTION, path, image, noindex = false }: {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  noindex?: boolean;
}) {
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
  const summary = description.replace(/\s+/gu, " ").trim();
  const url = pageUrl(path);
  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: summary },
      { name: "robots", content: noindex ? "noindex, follow" : "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "zh_CN" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: summary },
      { property: "og:url", content: url },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: summary },
      ...(image ? [
        { property: "og:image", content: pageUrl(image) },
        { property: "og:image:alt", content: title },
        { name: "twitter:image", content: pageUrl(image) },
        { name: "twitter:image:alt", content: title },
      ] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function publicationHead(data: PublicationDetailResponse | undefined, id: string) {
  return seoHead({
    title: data?.item.title ?? "情报详情",
    description: data ? publicationDescription(data) : SITE_DESCRIPTION,
    path: `/updates/${encodeURIComponent(data?.item.id ?? id)}`,
    image: data?.assets.find((asset) => asset.mimeType.startsWith("image/"))?.url ?? data?.item.animeCoverUrl,
  });
}
