import { Link } from "@tanstack/react-router";
import type { AnimeSummary, Season } from "@/domain";
import { shortDate } from "@/lib/format";
import { CoverImage } from "./cover-image";

export function SeasonHero({ season, anime, archived = false }: {
  season: Season | undefined;
  anime: AnimeSummary[];
  archived?: boolean;
}) {
  const featured = anime.filter((item) => item.coverUrl).slice(0, 3);

  return (
    <header className="relative min-h-[300px] py-7 md:min-h-[340px] md:py-10">
      <div className="grid gap-9 md:grid-cols-[minmax(0,1fr)_minmax(330px,500px)] md:items-center">
        <div className="relative z-10 md:pt-6">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
            <span className="size-1.5 rounded-full bg-signal-coral" />{season?.label ?? "当季"}
          </p>
          <h1 className="mt-4 max-w-2xl text-[38px] leading-[0.98] font-black tracking-[-0.05em] sm:text-5xl lg:text-[56px]">
            {archived ? "百合动画" : "当季百合动画"}
          </h1>
          {season && (
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-3 gap-y-1 border border-black/[0.06] bg-white/72 px-4 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-muted shadow-[0_12px_32px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
              <span>{shortDate(season.startsOn)}—{shortDate(season.endsOn)}</span>
              <span className="h-3 w-px bg-black/15" />
              <span>{anime.length} 部</span>
            </div>
          )}
        </div>

        {featured.length > 0 && (
          <div className="relative grid grid-cols-3 items-end gap-2.5 pb-5 sm:gap-4 md:pb-0" aria-label="当季作品封面">
            {featured.map((item, index) => (
              <Link
                key={item.id}
                to="/anime/$slug"
                params={{ slug: item.slug }}
                className={index === 0 ? "-translate-y-2" : index === 1 ? "translate-y-5" : "-translate-y-5"}
                aria-label={item.titleZh}
              >
                <span className="mb-2 flex justify-end text-[9px] text-muted">
                  <span className="truncate font-medium">{item.primarySlot?.localTime ?? "—"}</span>
                </span>
                <CoverImage
                  className="aspect-[3/4] w-full rounded-[6px] shadow-[0_22px_45px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.08] transition duration-300 hover:-translate-y-1"
                  src={item.coverUrl}
                  alt={`${item.titleZh} 封面`}
                  eager
                />
              </Link>
            ))}
            <div className="absolute right-0 -bottom-1 flex items-end gap-2 text-right" aria-hidden="true">
              <strong className="text-5xl leading-none font-black tracking-[-0.07em]">{anime.length}</strong>
              <span className="pb-1 text-[8px] font-bold tracking-[0.14em] text-muted uppercase">titles</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
