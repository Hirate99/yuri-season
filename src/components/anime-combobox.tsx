import { Check, ChevronDown, ListFilter, Search } from "lucide-react";
import { useSelect } from "downshift";
import { useMemo, useState } from "react";
import type { AnimeOption } from "@/domain";

type SelectOption = { id: string; slug: string; label: string };

const allAnimeOption: SelectOption = { id: "all", slug: "", label: "全部作品" };

export function AnimeCombobox({
  anime,
  value,
  onChange,
  compact = false,
}: {
  anime: AnimeOption[];
  value: string;
  onChange: (slug: string) => void;
  compact?: boolean;
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
          title: selected.label,
          className: `group relative flex h-10 w-full items-center rounded-lg bg-white text-ink transition focus-visible:outline-2 focus-visible:outline-accent ${compact ? "justify-center px-2 hover:bg-accent-soft/40 md:justify-end" : "border border-line px-3 hover:border-accent/40"}`,
        })}
      >
        {compact && <ListFilter size={18} className={value ? "text-accent md:hidden" : "text-muted md:hidden"} aria-hidden="true" />}
        {compact && value && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent md:hidden" aria-hidden="true" />}
        <span className={`min-w-0 truncate text-sm ${compact ? "hidden md:block" : "flex-1 text-left"}`}>{selected.label}</span>
        <ChevronDown
          aria-hidden="true"
          size={15}
          className={`ml-2 shrink-0 text-muted transition-transform duration-200 group-hover:text-ink ${compact ? "hidden md:block" : ""} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          {...getMenuProps()}
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-xl border border-line bg-white p-2 shadow-[0_8px_24px_rgba(37,35,43,0.12)]"
        >
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
              className="h-10 w-full appearance-none rounded-lg bg-raised pl-9 pr-3 text-base outline-none placeholder:text-muted focus:bg-white focus:ring-2 focus:ring-accent-soft md:text-sm"
            />
          </div>
          <ul className="max-h-[min(18rem,calc(100dvh-17rem))] overflow-y-auto pt-1.5">
            {filtered.map((item, index) => {
              const active = item.slug === selected.slug;
              return (
                <li
                  {...getItemProps({ item, index })}
                  key={item.id}
                  className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm text-ink outline-none transition-colors ${highlightedIndex === index ? "bg-accent-soft/60" : ""} ${active ? "font-semibold text-accent" : ""}`}
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
