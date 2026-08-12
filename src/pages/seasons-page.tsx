import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { SeasonsResponse } from "@/domain";
import { shortDate } from "@/lib/format";
import { page } from "@/lib/ui";

export function SeasonsPage({ data }: { data: SeasonsResponse }) {
  return (
    <div className={page}>
      <header className="rounded-[26px] bg-raised p-5 md:p-8">
        <h1 className="text-3xl font-bold tracking-[-0.04em] md:text-5xl">季度</h1>
      </header>
      <div className="mt-6 grid max-w-3xl gap-2">
        {data.seasons.map((season) => (
          <Link
            key={season.id}
            to="/season/$slug"
            params={{ slug: season.slug }}
            className="grid grid-cols-[1fr_auto] items-center gap-5 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_9px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span>
              <strong className="text-base">{season.label}</strong>
              <small className="mt-1 block text-[10px] text-muted">
                {shortDate(season.startsOn)}—{shortDate(season.endsOn)} · {season.animeCount} 部
              </small>
            </span>
            <span className="flex items-center gap-3 text-xs text-muted">
              {season.isCurrent && <span>当季</span>}
              <ArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
