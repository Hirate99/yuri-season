import type { AdminAnimeSummary, SeasonSummary } from "@/domain";
import { cn } from "@/lib/ui";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { NewWorkEditor } from "./new-work-editor";
import { WorkEditor } from "./work-editor";

export function WorksPanel({
  anime,
  seasons,
}: {
  anime: AdminAnimeSummary[];
  seasons: SeasonSummary[];
}) {
  const currentSeason = seasons.find((season) => season.isCurrent)?.id ?? "all";
  const [query, setQuery] = useState("");
  const [seasonId, setSeasonId] = useState(currentSeason);

  const [selectedId, setSelectedId] = useState(
    () => anime.find((item) => item.seasonId === currentSeason)?.id ?? anime[0]?.id ?? null,
  );

  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();

    return anime.filter(
      (item) =>
        (seasonId === "all" || item.seasonId === seasonId) &&
        (!needle ||
          [item.titleZh, item.titleJa, item.titleEn, item.slug].some((value) =>
            value?.toLocaleLowerCase().includes(needle),
          )),
    );
  }, [anime, query, seasonId]);

  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="self-start rounded-3xl border border-black/[0.06] bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.05)] lg:sticky lg:top-5">
        <div className="flex items-center gap-2 px-1 pb-3">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input
              className="h-10 w-full rounded-xl bg-[#f4f5f7] pl-9 pr-3 text-xs outline-none focus:ring-3 focus:ring-[#786bd1]/10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索作品"
            />
          </label>
          <button
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#786bd1] text-white"
            onClick={() => setCreating((value) => !value)}
            aria-label="新增作品"
          >
            <Plus size={17} />
          </button>
        </div>
        <select
          className="mb-2 h-9 w-full rounded-xl bg-[#f4f5f7] px-3 text-[10px] font-semibold outline-none"
          value={seasonId}
          onChange={(event) => setSeasonId(event.target.value)}
        >
          <option value="all">全部季度</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
        <div className="grid max-h-[calc(100vh-12rem)] gap-1 overflow-y-auto overscroll-contain pr-1">
          {visible.map((item) => (
            <button
              className={cn(
                "rounded-2xl px-3 py-3 text-left transition",
                selected?.id === item.id ? "bg-[#eeeafd] text-[#51459d]" : "hover:bg-[#f6f7f8]",
              )}
              key={item.id}
              onClick={() => {
                setSelectedId(item.id);
                setCreating(false);
              }}
            >
              <strong className="line-clamp-2 text-xs leading-5">{item.titleZh}</strong>
              <span className="mt-1 block truncate text-[9px] text-muted">
                {item.seasonLabel} · {item.status}
              </span>
            </button>
          ))}
          {visible.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted">没有匹配的作品</p>
          )}
        </div>
      </aside>

      <section className="min-w-0">
        {creating ? (
          <NewWorkEditor seasons={seasons} onCreated={() => setCreating(false)} open />
        ) : selected ? (
          <WorkEditor key={selected.id} item={selected} anime={anime} />
        ) : (
          <div className="rounded-3xl bg-white p-8 text-sm text-muted">请选择一部作品</div>
        )}
      </section>
    </div>
  );
}
