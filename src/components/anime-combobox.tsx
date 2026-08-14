import { Check, ChevronDown, Search } from "lucide-react";
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
    <div className="relative min-w-0">
      <button
        {...getToggleButtonProps({
          type: "button",
          "aria-label": "按作品筛选",
          className: "group flex h-11 w-full items-center rounded-xl border border-black/[0.06] bg-white px-3.5 text-ink shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition hover:border-black/10 hover:bg-[#fafafa] focus:border-[#786bd1]/25 focus:ring-3 focus:ring-[#786bd1]/10",
        })}
      >
        <span className="shrink-0 border-r border-black/[0.07] pr-2.5 text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
          作品
        </span>
        <span className="min-w-0 flex-1 truncate pl-2.5 text-left text-xs font-semibold">{selected.label}</span>
        <ChevronDown
          aria-hidden="true"
          size={15}
          className={`ml-2 shrink-0 text-muted transition-transform duration-200 group-hover:text-ink ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          {...getMenuProps()}
          className="absolute top-[calc(100%+10px)] right-0 z-50 w-[min(22rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-2xl border border-black/[0.07] bg-white/95 p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-2xl"
        >
          <div className="px-2.5 pt-2 pb-1.5">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">选择作品</p>
          </div>
          <div className="relative px-1 pb-1.5">
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
              className="h-10 w-full appearance-none rounded-xl border border-transparent bg-raised pl-9 pr-3 text-base outline-none transition placeholder:text-muted focus:border-[#786bd1]/15 focus:bg-white focus:ring-3 focus:ring-[#786bd1]/10 md:text-xs"
            />
          </div>
          <ul className="max-h-[320px] overflow-y-auto border-t border-black/[0.05] pt-1.5">
            {filtered.map((item, index) => {
              const active = item.slug === selected.slug;
              return (
                <li
                  {...getItemProps({ item, index })}
                  key={item.id}
                  className={`flex min-h-10 cursor-default items-center gap-2.5 rounded-xl px-3 text-xs text-ink outline-none transition-colors ${highlightedIndex === index ? "bg-[#f1efff]" : ""} ${active ? "font-semibold text-[#554aaf]" : ""}`}
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
