import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import type { PublicationDetailResponse } from "@/domain";
import { LocalDateTime } from "@/components/local-date-time";
import { contentLabel } from "@/lib/format";
import { page } from "@/lib/ui";

const textModeLabel = {
  full: "完整原文",
  full_with_translation: "原文＋中文整理",
  excerpt: "原文节选",
  summary_only: "中文整理",
  link_only: "原文链接",
  withdrawn: "已撤回",
} as const;

function paragraphs(value: string): string[] {
  return value.split(/\n{2,}/u).map((part) => part.trim()).filter(Boolean);
}

export function PublicationPage({ data }: { data: PublicationDetailResponse }) {
  const { item, document, assets, corrections } = data;
  const hero = assets.find((asset) => asset.variant === "preview") ?? assets.at(-1);
  const legacyPreview = item.media?.previewUrl && item.media.presentationMode !== "link_only"
    ? item.media.previewUrl
    : null;
  const heroUrl = hero?.url ?? legacyPreview;
  const relatedAnime = item.relatedAnime ?? [];

  return (
    <div className={`${page} pb-24`}>
      <header className="border-b border-line py-7 md:py-10">
        <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink" to="/feed">
          <ArrowLeft size={14} />返回情报
        </Link>
        <div className="mt-7 flex flex-wrap items-center gap-2 text-[10px] text-muted">
          <span className="rounded-full bg-raised px-2.5 py-1 font-semibold text-ink">{contentLabel(item.contentClass)}</span>
          <span>{item.sourceName}{item.sourceAccount ? ` · ${item.sourceAccount}` : ""}</span>
          <span aria-hidden="true">·</span>
          <LocalDateTime value={item.publishedAt} />
        </div>
        <h1 className="mt-5 max-w-4xl text-3xl leading-[1.16] font-black tracking-[-0.035em] md:text-5xl">{item.title}</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-[#50545b] md:text-base md:leading-8">{item.summary}</p>
      </header>

      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <main className="min-w-0">
          {heroUrl && (
            <figure className="mb-10 overflow-hidden rounded-[10px] border border-black/[0.06] bg-raised">
              <img className="max-h-[720px] w-full object-contain" src={heroUrl} alt={hero?.altText ?? item.media?.title ?? item.title} decoding="async" referrerPolicy="no-referrer" />
              <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[10px] text-muted">
                <span>{hero ? (hero.rightsStatus === "licensed" ? "获授权镜像" : hero.rightsStatus === "press_kit" ? "官方媒体素材" : "经审核的官方宣传素材") : item.media?.rightsNote ?? "来源预览"}</span>
                <a className="hover:text-ink" href={hero?.sourceUrl ?? item.media?.originalUrl ?? item.url} target="_blank" rel="noreferrer">图片来源 ↗</a>
              </figcaption>
            </figure>
          )}

          {document?.publicText && (
            <section aria-labelledby="source-text-heading">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
                <h2 id="source-text-heading" className="text-lg font-bold">来源原文</h2>
                <span className="text-[10px] text-muted">{textModeLabel[document.textMode]}{document.sourceLanguage ? ` · ${document.sourceLanguage}` : ""}</span>
              </div>
              <div className="mt-6 space-y-5 text-sm leading-8 text-[#30343a]">
                {paragraphs(document.publicText).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}
              </div>
            </section>
          )}

          {!document?.publicText && (
            <section className="border border-line bg-raised p-5 text-sm leading-7 text-muted">
              本页保留经过核对的中文摘要；来源正文未在本站公开镜像。
            </section>
          )}

          {corrections.length > 0 && (
            <section className="mt-12 border-t border-line pt-6">
              <h2 className="text-sm font-bold">更正记录</h2>
              <ul className="mt-3 space-y-2 text-xs leading-6 text-muted">
                {corrections.map((correction) => (
                  <li key={`${correction.createdAt}:${correction.reason}`}>
                    <LocalDateTime value={correction.createdAt} /> · {correction.reason}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-[10px] border border-black/[0.06] bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <h2 className="text-xs font-bold">原始出处</h2>
            <dl className="mt-4 grid gap-3 text-[11px] leading-5">
              <div><dt className="text-muted">来源</dt><dd className="mt-0.5 font-medium">{document?.authorName ?? item.sourceName}</dd></div>
              {document?.sourceTitle && <div><dt className="text-muted">原始标题</dt><dd className="mt-0.5">{document.sourceTitle}</dd></div>}
              <div><dt className="text-muted">发布时间</dt><dd className="mt-0.5"><LocalDateTime value={item.publishedAt} /></dd></div>
              {document && <div><dt className="text-muted">本站收录</dt><dd className="mt-0.5"><LocalDateTime value={document.capturedAt} /></dd></div>}
            </dl>
            <a className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-charcoal px-4 py-2.5 text-xs font-semibold text-white" href={item.url} target="_blank" rel="noreferrer">
              查看原文<ArrowUpRight size={14} />
            </a>
          </section>

          {(item.animeSlug || relatedAnime.length > 0) && (
            <section className="rounded-[10px] border border-line p-5">
              <h2 className="text-xs font-bold">相关作品</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.animeSlug && item.animeTitle && (
                  <Link className="rounded-full bg-raised px-3 py-1.5 text-[11px] font-medium hover:bg-line" to="/anime/$slug" params={{ slug: item.animeSlug }}>{item.animeTitle}</Link>
                )}
                {relatedAnime.filter((work) => work.slug !== item.animeSlug).map((work) => (
                  <Link className="rounded-full bg-raised px-3 py-1.5 text-[11px] font-medium hover:bg-line" key={work.id} to="/anime/$slug" params={{ slug: work.slug }}>{work.title}</Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
