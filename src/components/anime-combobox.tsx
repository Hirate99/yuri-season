import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useSelect } from "downshift";
import { useMemo, useState } from "react";
import type { CatalogResponse } from "@/domain";

type AnimeOption = { id: string; slug: string; label: string };

const allAnimeOption: AnimeOption = { id: "all", slug: "", label: "全部作品" };

export function AnimeCombobox({
  anime,
  value,
  onChange,
}: {
  anime: CatalogResponse["anime"];
  value: string;
  onChange: (slug: string) => void;
}) {
  const options = useMemo(() => [
    allAnimeOption,
    ...anime.map((item) => ({ id: item.id, slug: item.slug, label: item.titleZh })),
  ], [anime]);
  const selected = options.find((item) => item.slug === value) ?? allAnimeOption;
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return options;
    const matchingAnime = anime.filter((item) => [item.titleZh, item.titleJa, item.titleEn]
      .some((title) => title?.toLocaleLowerCase().includes(normalized)));
    return matchingAnime.map((item) => ({ id: item.id, slug: item.slug, label: item.titleZh }));
  }, [anime, options, query]);
  const {
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    highlightedIndex,
    isOpen,
    selectItem,
    setHighlightedIndex,
    closeMenu,
  } = useSelect({
    items: filtered,
    selectedItem: selected,
    itemToString: (item) => item?.label ?? "",
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) return;
      setQuery("");
      onChange(selectedItem.slug);
    },
    onIsOpenChange: ({ isOpen: open }) => {
      if (!open) setQuery("");
    },
  });

  const moveHighlight = (delta: number) => {
    if (filtered.length === 0) return;
    const next = highlightedIndex < 0
      ? (delta > 0 ? 0 : filtered.length - 1)
      : (highlightedIndex + delta + filtered.length) % filtered.length;
    setHighlightedIndex(next);
  };

  return (
    <div className="relative">
      <button
        {...getToggleButtonProps({
          type: "button",
          "aria-label": "按作品筛选",
          className: "flex h-10 w-full items-center gap-2 rounded-xl border border-transparent bg-raised px-3 font-medium text-ink outline-none transition hover:bg-[#eef0f3] focus:border-black/10 focus:bg-white focus:ring-3 focus:ring-[#786bd1]/10",
        })}
      >
        <Search size={14} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-left text-xs">{selected.label}</span>
        <ChevronsUpDown size={14} className="shrink-0 text-muted" />
      </button>

      {isOpen && (
        <div
          {...getMenuProps()}
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-full origin-top-right rounded-2xl border border-black/[0.07] bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl"
        >
          <div className="relative p-2 pb-0">
            <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" size={14} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveHighlight(1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveHighlight(-1);
                } else if (event.key === "Enter" && highlightedIndex >= 0) {
                  event.preventDefault();
                  selectItem(filtered[highlightedIndex]);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  closeMenu();
                }
              }}
              placeholder="搜索作品"
              type="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-label="搜索作品"
              className="h-10 w-full rounded-xl bg-raised pl-9 pr-3 text-base outline-none transition placeholder:text-muted focus:ring-3 focus:ring-[#786bd1]/10 md:text-xs"
            />
          </div>
          <ul className="max-h-[320px] overflow-y-auto p-1.5">
            {filtered.map((item, index) => {
              const active = item.slug === selected.slug;
              return (
                <li
                  {...getItemProps({ item, index })}
                  key={item.id}
                  className={`flex min-h-10 cursor-default items-center gap-2.5 rounded-xl px-3 text-xs text-ink outline-none ${highlightedIndex === index ? "bg-[#f1efff]" : ""} ${active ? "font-semibold" : ""}`}
                >
                  <Check className={`shrink-0 text-[#786bd1] ${active ? "visible" : "invisible"}`} size={14} />
                  <span className="truncate">{item.label}</span>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted">没有匹配作品</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
