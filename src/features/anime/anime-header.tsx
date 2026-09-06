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
  const cover = (
    <CoverImage
      className="aspect-[3/4] w-full rounded-[6px] shadow-md ring-1 ring-black/[0.06]"
      src={anime.coverUrl}
      alt={`${anime.titleZh} 封面`}
      eager
    />
  );

  return (
    <header className="grid grid-cols-[100px_minmax(0,1fr)] gap-x-4 gap-y-5 py-2 sm:grid-cols-[180px_minmax(0,1fr)] md:gap-x-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-4">
      <div className="self-start sm:row-span-2">
        {anime.coverSourceUrl ? (
          <a href={anime.coverSourceUrl} target="_blank" rel="noreferrer" aria-label="查看封面来源">
            {cover}
          </a>
        ) : (
          cover
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{yuriDisplayLabel(anime.yuriKind, anime.yuriStatus)}</span>
          <span>{statusLabel(anime.status)}</span>
          <EpisodeProgressBadge episode={anime.currentEpisode} />
        </div>
        <h1 className="mt-3 text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl md:text-4xl">
          {anime.titleZh}
        </h1>
        <p className="mt-2 text-sm font-medium md:text-base">{anime.titleJa}</p>
        {anime.titleEn && <p className="mt-1 text-[11px] text-muted">{anime.titleEn}</p>}
      </div>
      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
        <p className="max-w-3xl text-base leading-6 text-muted md:leading-8">{anime.synopsis}</p>

        <div className="surface mt-5 p-4 md:p-5">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm md:grid-cols-4 [&_dt]:text-xs">
            <div className="min-w-0">
              <dt className="text-muted">制作</dt>
              <dd className="mt-1 font-medium">{anime.studio ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted">首播</dt>
              <dd className="mt-1 font-medium">{shortDate(anime.premiereAt)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted">原作</dt>
              <dd className="mt-1 font-medium">{anime.sourceMaterial ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted">话数</dt>
              <dd className="mt-1 font-medium">
                {anime.episodeCount ? `${anime.episodeCount} 话` : "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            {anime.officialUrl && <ExternalLink href={anime.officialUrl}>公式站</ExternalLink>}
            {anime.bangumiUrl && <ExternalLink href={anime.bangumiUrl}>Bangumi</ExternalLink>}
            {anime.officialXUrl && <ExternalLink href={anime.officialXUrl}>公式账号</ExternalLink>}
          </div>
        </div>
      </div>
    </header>
  );
}
