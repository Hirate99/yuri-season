import type { AdminAnimeCoverage, SeasonSummary } from "@/domain";
import { cn } from "@/lib/ui";

import { coverageChecks } from "@/domain/coverage";

export function CoveragePanel({
  items,
  seasons,
}: {
  items: AdminAnimeCoverage[];
  seasons: SeasonSummary[];
}) {
  const current = seasons.find((season) => season.isCurrent);

  const visible = items
    .filter((item) => !current || item.seasonId === current.id)
    .map((item) => ({ item, checks: coverageChecks(item) }))
    .sort(
      (a, b) =>
        b.checks.filter((check) => !check.ready).length -
          a.checks.filter((check) => !check.ready).length ||
        a.item.animeTitle.localeCompare(b.item.animeTitle),
    );

  const ready = visible.filter(({ checks: itemChecks }) =>
    itemChecks.every((check) => check.ready),
  ).length;

  return (
    <div>
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted">{current?.label ?? "当前季度"}</p>
          <h2 className="mt-1 text-xl font-bold">资料覆盖</h2>
        </div>
        <p className="text-xs tabular-nums text-muted">
          {ready} / {visible.length}
        </p>
      </header>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {visible.map(({ item, checks: itemChecks }) => {
          const missing = itemChecks.filter((check) => !check.ready);

          return (
            <article
              className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)]"
              key={item.animeId}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-semibold leading-5">{item.animeTitle}</h3>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-1 text-[9px] font-bold tabular-nums",
                    missing.length === 0
                      ? "bg-[#e9f7ef] text-[#26704a]"
                      : "bg-[#f1efff] text-[#6759bd]",
                  )}
                >
                  {missing.length === 0 ? "完成" : `缺 ${missing.length}`}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {itemChecks.map((check) => (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] tabular-nums",
                      check.ready
                        ? "bg-[#f4f5f7] text-[#6e737a]"
                        : check.core
                          ? "bg-[#fff0f4] text-[#a33f61]"
                          : "bg-[#f1efff] text-[#6759bd]",
                    )}
                    key={check.label}
                  >
                    {check.label} {check.value}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
