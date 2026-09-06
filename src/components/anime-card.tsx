import { Link } from "@tanstack/react-router";
import type { CatalogAnime } from "@/domain";
import { weekdayLabel, yuriDisplayLabel } from "@/lib/format";
import { CoverImage } from "./cover-image";
import { BroadcastTime } from "./broadcast-time";
import { EpisodeProgressBadge } from "./episode-progress-badge";

export function AnimeCard({
  anime,
  viewerTimeZone,
  now,
}: {
  anime: CatalogAnime;
  viewerTimeZone?: string;
  now?: Date;
}) {
  return (
    <article className="group min-w-0">
      <Link
        to="/anime/$slug"
        params={{ slug: anime.slug }}
        className="block rounded-lg outline-offset-4"
      >
        <span className="relative block overflow-hidden rounded-[8px] bg-[#eceef1] ring-1 ring-black/[0.06]">
          <CoverImage
            className="aspect-[3/4] w-full transition duration-300 group-hover:scale-[1.015]"
            src={anime.coverUrl}
            alt={`${anime.titleZh} 封面`}
          />
        </span>
      </Link>
      <div className="px-0.5 pt-3">
        <h3 className="min-h-11 line-clamp-2 text-sm leading-[22px] font-semibold group-hover:text-accent md:text-[15px]">
          <Link to="/anime/$slug" params={{ slug: anime.slug }}>
            {anime.titleZh}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
          <span className="rounded bg-accent-soft/60 px-1.5 py-0.5 font-medium text-accent">
            {yuriDisplayLabel(anime.yuriKind, anime.yuriStatus)}
          </span>
          <span className="[&>span]:font-normal [&>span]:text-muted">
            <EpisodeProgressBadge episode={anime.currentEpisode} />
          </span>
        </div>
        {anime.primarySlot && (
          <div className="mt-1.5 flex items-start gap-2 text-xs text-muted [&_strong]:text-xs">
            <span className="pt-px">{weekdayLabel(anime.primarySlot.weekday)}</span>
            <BroadcastTime
              slot={anime.primarySlot}
              viewerTimeZone={viewerTimeZone}
              now={now}
              reserveLocalSpace
            />
          </div>
        )}
      </div>
    </article>
  );
}
