import type { AnimeDetail } from "@/domain";
import { CoverImage } from "@/components/cover-image";
import { EpisodeProgressBadge } from "@/components/episode-progress-badge";
import { shortDate, yuriDisplayLabel } from "@/lib/format";
import { ExternalLink } from "./external-link";

function statusLabel(status: AnimeDetail["status"]): string {
  const labels = { airing: "放送中", upcoming: "未放送", finished: "已完结", paused: "暂停" };
  return labels[status];
}

export function AnimeHeader({ anime }: { anime: AnimeDetail }) {
  const cover = <CoverImage className="aspect-[3/4] w-full rounded-[6px] shadow-[0_20px_45px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.06]" src={anime.coverUrl} alt={`${anime.titleZh} 封面`} eager />;

  return (
    <header className="grid gap-7 py-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:px-6 sm:py-10 md:gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-10 lg:py-12">
      <div className="w-[144px] sm:w-auto">
        {anime.coverSourceUrl ? <a href={anime.coverSourceUrl} target="_blank" rel="noreferrer" aria-label="查看封面来源">{cover}</a> : cover}
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{yuriDisplayLabel(anime.yuriKind, anime.yuriStatus)}</span>
          <span>{statusLabel(anime.status)}</span>
          <EpisodeProgressBadge episode={anime.currentEpisode} />
        </div>
        <h1 className="mt-4 text-3xl leading-[1.08] font-bold tracking-[-0.045em] md:text-5xl">{anime.titleZh}</h1>
        <p className="mt-3 text-sm font-medium md:text-base">{anime.titleJa}</p>
        {anime.titleEn && <p className="mt-1 text-[11px] text-muted">{anime.titleEn}</p>}
        <p className="mt-6 max-w-3xl text-sm leading-7 text-[#424943]">{anime.synopsis}</p>

        <dl className="mt-7 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <div className="border border-black/[0.06] bg-white/75 p-3 shadow-sm backdrop-blur-xl"><dt className="text-muted">制作</dt><dd className="mt-1 font-medium">{anime.studio ?? "—"}</dd></div>
          <div className="border border-black/[0.06] bg-white/75 p-3 shadow-sm backdrop-blur-xl"><dt className="text-muted">首播</dt><dd className="mt-1 font-medium">{shortDate(anime.premiereAt)}</dd></div>
          <div className="border border-black/[0.06] bg-white/75 p-3 shadow-sm backdrop-blur-xl"><dt className="text-muted">原作</dt><dd className="mt-1 font-medium">{anime.sourceMaterial ?? "—"}</dd></div>
          <div className="border border-black/[0.06] bg-white/75 p-3 shadow-sm backdrop-blur-xl"><dt className="text-muted">话数</dt><dd className="mt-1 font-medium">{anime.episodeCount ? `${anime.episodeCount} 话` : "—"}</dd></div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {anime.officialUrl && <ExternalLink href={anime.officialUrl}>公式站</ExternalLink>}
          {anime.bangumiUrl && <ExternalLink href={anime.bangumiUrl}>Bangumi</ExternalLink>}
          {anime.officialXUrl && <ExternalLink href={anime.officialXUrl}>公式账号</ExternalLink>}
        </div>
      </div>
    </header>
  );
}
