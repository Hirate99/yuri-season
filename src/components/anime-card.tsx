import { Link } from "@tanstack/react-router";
import { RadioTower } from "lucide-react";
import type { AnimeSummary } from "@/domain";
import { weekdayLabel, yuriDisplayLabel } from "@/lib/format";
import { Badge } from "./badge";
import { CoverImage } from "./cover-image";
import { BroadcastTime } from "./broadcast-time";
import { EpisodeProgressBadge } from "./episode-progress-badge";

export function AnimeCard({ anime }: { anime: AnimeSummary }) {
  return (
    <article className="group min-w-0">
      <Link to="/anime/$slug" params={{ slug: anime.slug }} className="block rounded-[8px] shadow-[0_10px_28px_rgba(15,23,42,0.09)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_38px_rgba(15,23,42,0.13)]">
        <span className="relative block overflow-hidden rounded-[8px] bg-[#eceef1] ring-1 ring-black/[0.06]">
          <CoverImage className="aspect-[3/4] w-full transition duration-300 group-hover:scale-[1.015]" src={anime.coverUrl} alt={`${anime.titleZh} 封面`} />
        </span>
      </Link>
      <div className="px-0.5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <Badge>{yuriDisplayLabel(anime.yuriKind, anime.yuriStatus)}</Badge>
          <EpisodeProgressBadge episode={anime.currentEpisode} />
        </div>
        <h3 className="mt-2 text-sm leading-snug font-bold"><Link to="/anime/$slug" params={{ slug: anime.slug }}>{anime.titleZh}</Link></h3>
        <p className="mt-1 line-clamp-1 text-[10px] text-muted">{anime.titleJa}</p>
        {anime.primarySlot && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted">
            <RadioTower className="mt-0.5 shrink-0" size={13} />
            <span className="pt-px">{weekdayLabel(anime.primarySlot.weekday)}</span>
            <BroadcastTime slot={anime.primarySlot} />
          </div>
        )}
      </div>
    </article>
  );
}
