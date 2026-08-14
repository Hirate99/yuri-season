import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import type { PublicationDetailResponse } from "@/domain";
import { LocalDateTime } from "@/components/local-date-time";
import { contentLabel } from "@/lib/format";

const textModeLabel = {
  full: "完整原文",
  full_with_translation: "完整原文",
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
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1120px] pt-6 pb-24 md:w-[calc(100%-3rem)] md:pt-8 md:pb-20">
      <Link className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink" to="/feed">
        <ArrowLeft size={13} />返回情报
      </Link>

      <article className="mt-8 md:mt-10">
        <header className="max-w-[820px]">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[11px] text-muted">
            <span className="rounded-full bg-[#f1efff] px-2.5 py-1 font-semibold text-[#5f53a7]">{contentLabel(item.contentClass)}</span>
            <span>{item.sourceName}{item.sourceAccount ? ` · ${item.sourceAccount}` : ""}</span>
            <span className="text-black/20" aria-hidden="true">·</span>
            <LocalDateTime value={item.publishedAt} />
          </div>
          <h1 className="mt-5 max-w-[780px] text-[clamp(1.75rem,2.8vw,2.5rem)] leading-[1.18] font-black tracking-[-0.035em]">{item.title}</h1>
          <p className="mt-4 max-w-[760px] text-[15px] leading-7 text-[#555a62] md:text-base md:leading-8">{item.summary}</p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,740px)_260px] lg:items-start lg:justify-between lg:gap-16">
          <div className="min-w-0">
            {heroUrl && (
              <figure className="mb-10 overflow-hidden rounded-2xl bg-raised">
                <img className="max-h-[720px] w-full object-contain" src={heroUrl} alt={hero?.altText ?? item.media?.title ?? item.title} decoding="async" referrerPolicy="no-referrer" />
                <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-[#f7f7f9] px-4 py-3 text-[10px] text-muted">
                  <span>{hero?.rightsStatus === "press_kit" ? "官方图片" : "图片来自原帖"}</span>
                  <a className="transition hover:text-ink" href={hero?.sourceUrl ?? item.media?.originalUrl ?? item.url} target="_blank" rel="noreferrer">图片来源 ↗</a>
                </figcaption>
              </figure>
            )}

            {document?.publicText && (
              <section aria-labelledby="source-text-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-4 w-1 rounded-full bg-[#8a7de2]" aria-hidden="true" />
                    <h2 id="source-text-heading" className="text-sm font-bold">来源原文</h2>
                  </div>
                  <span className="rounded-full bg-raised px-2.5 py-1 text-[10px] text-muted">{textModeLabel[document.textMode]}{document.sourceLanguage ? ` · ${document.sourceLanguage}` : ""}</span>
                </div>
                <div className="mt-5 space-y-5 text-[15px] leading-8 text-[#30343a] md:text-base md:leading-9">
                  {paragraphs(document.publicText).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}
                </div>
              </section>
            )}

            {document?.publicTranslation && (
              <section className="mt-10" aria-labelledby="source-translation-heading">
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-1 rounded-full bg-signal-coral" aria-hidden="true" />
                  <h2 id="source-translation-heading" className="text-sm font-bold">中文翻译</h2>
                </div>
                <div className="mt-5 space-y-5 text-[15px] leading-8 text-[#454a52] md:text-base md:leading-9">
                  {paragraphs(document.publicTranslation).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}
                </div>
              </section>
            )}

            {!document?.publicText && (
              <section className="rounded-2xl bg-raised px-5 py-4" aria-label="来源正文状态">
                <p className="text-xs font-semibold text-ink">本站暂未收录来源正文</p>
                <p className="mt-1 text-xs leading-6 text-muted">这里保留经过核对的中文摘要，完整内容可前往来源页面查看。</p>
              </section>
            )}

            {corrections.length > 0 && (
              <section className="mt-12 rounded-2xl bg-[#fff7f8] p-5">
                <h2 className="text-xs font-bold text-[#863a50]">更正记录</h2>
                <ul className="mt-3 space-y-2 text-xs leading-6 text-[#775c65]">
                  {corrections.map((correction) => (
                    <li key={`${correction.createdAt}:${correction.reason}`}>
                      <LocalDateTime value={correction.createdAt} /> · {correction.reason}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <section className="rounded-2xl bg-raised p-5">
              <h2 className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">来源</h2>
              <dl className="mt-4 grid gap-4 text-[11px] leading-5">
                <div><dt className="text-muted">发布者</dt><dd className="mt-0.5 font-semibold text-ink">{document?.authorName ?? item.sourceName}</dd></div>
                {document?.sourceTitle && <div><dt className="text-muted">原始标题</dt><dd className="mt-0.5 text-ink">{document.sourceTitle}</dd></div>}
                <div><dt className="text-muted">发布时间</dt><dd className="mt-0.5 text-ink"><LocalDateTime value={item.publishedAt} /></dd></div>
                {document && <div><dt className="text-muted">本站收录</dt><dd className="mt-0.5 text-ink"><LocalDateTime value={document.capturedAt} /></dd></div>}
              </dl>
              <a className="group mt-5 flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-semibold text-ink shadow-[0_5px_18px_rgba(15,23,42,0.06)] transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.1)]" href={item.url} target="_blank" rel="noreferrer">
                查看原文<ArrowUpRight className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={14} />
              </a>
            </section>

            {(item.animeSlug || relatedAnime.length > 0) && (
              <section className="px-1">
                <h2 className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">相关作品</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.animeSlug && item.animeTitle && (
                    <Link className="rounded-full bg-raised px-3 py-1.5 text-[11px] font-medium transition hover:bg-[#ece9fb]" to="/anime/$slug" params={{ slug: item.animeSlug }}>{item.animeTitle}</Link>
                  )}
                  {relatedAnime.filter((work) => work.slug !== item.animeSlug).map((work) => (
                    <Link className="rounded-full bg-raised px-3 py-1.5 text-[11px] font-medium transition hover:bg-[#ece9fb]" key={work.id} to="/anime/$slug" params={{ slug: work.slug }}>{work.title}</Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </article>
    </div>
  );
}
