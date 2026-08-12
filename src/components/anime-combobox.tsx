import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useCombobox } from "downshift";
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
  const [query, setQuery] = useState(selected.label);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized || normalized === selected.label.toLocaleLowerCase()) return options;
    const matchingAnime = anime.filter((item) => [item.titleZh, item.titleJa, item.titleEn]
      .some((title) => title?.toLocaleLowerCase().includes(normalized)));
    return matchingAnime.map((item) => ({ id: item.id, slug: item.slug, label: item.titleZh }));
  }, [anime, options, query, selected.label]);
  const {
    getInputProps,
    getItemProps,
    getLabelProps,
    getMenuProps,
    getToggleButtonProps,
    highlightedIndex,
    isOpen,
  } = useCombobox({
    items: filtered,
    inputValue: query,
    itemToString: (item) => item?.label ?? "",
    selectedItem: selected,
    onInputValueChange: ({ inputValue, type }) => {
      if (type === useCombobox.stateChangeTypes.InputBlur) return;
      setQuery(inputValue ?? "");
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) return;
      setQuery(selectedItem.label);
      onChange(selectedItem.slug);
    },
    onIsOpenChange: ({ isOpen, selectedItem }) => {
      if (!isOpen) setQuery(selectedItem?.label ?? selected.label);
    },
  });

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" size={14} />
        <label className="sr-only" {...getLabelProps()}>按作品筛选</label>
        <input
          {...getInputProps({
            "aria-label": "按作品筛选",
            onFocus: (event) => event.currentTarget.select(),
          })}
          className="h-10 w-full rounded-xl border border-transparent bg-raised pr-10 pl-9 text-xs font-medium text-ink outline-none transition placeholder:text-muted hover:bg-[#eef0f3] focus:border-black/10 focus:bg-white focus:ring-3 focus:ring-[#786bd1]/10"
          placeholder="搜索作品"
        />
        <button {...getToggleButtonProps()} type="button" className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-xl text-muted transition hover:text-ink" aria-label="展开作品列表">
          <ChevronsUpDown size={14} />
        </button>
      </div>

      <ul
        {...getMenuProps()}
        className={`absolute top-[calc(100%+8px)] right-0 z-50 max-h-[360px] w-full origin-top-right overflow-y-auto rounded-2xl border border-black/[0.07] bg-white/92 p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition duration-150 ease-out ${isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-1 scale-[0.98] opacity-0"}`}
      >
        {isOpen && filtered.map((item, index) => {
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
        {isOpen && filtered.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted">没有匹配作品</li>}
      </ul>
    </div>
  );
}
