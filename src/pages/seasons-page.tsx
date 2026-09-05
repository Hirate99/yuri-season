import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { SeasonsResponse } from "@/domain";
import { shortDate } from "@/lib/format";
import { page } from "@/lib/ui";

export function SeasonsPage({ data }: { data: SeasonsResponse }) {
  return (
    <div className={page}>
      <header className="page-header">
        <h1 className="page-title">季度</h1>
      </header>
      <div className="grid max-w-3xl gap-2">
        {data.seasons.map((season) => (
          <Link
            key={season.id}
            to="/season/$slug"
            params={{ slug: season.slug }}
            className="grid grid-cols-[1fr_auto] items-center gap-5 px-1 py-6 transition hover:text-accent"
          >
            <span>
              <strong className="text-base">{season.label}</strong>
              <small className="mt-2 block text-xs text-muted">
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
