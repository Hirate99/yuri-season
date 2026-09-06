import { Button as BaseButton } from "@base-ui/react/button";
import { Select } from "@base-ui/react/select";
import { Avatar } from "@base-ui/react/avatar";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/ui";

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar.Root
      aria-label={`${name}的头像`}
      className={cn(
        "inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-100 text-xs font-semibold text-accent",
        className,
      )}
    >
      <Avatar.Fallback className="grid size-full place-items-center">
        {Array.from(name.trim())[0]?.toUpperCase() || "?"}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}

export function Pagination({
  page,
  onPageChange,
  query,
  label,
  scrollTarget,
}: {
  page: number;
  onPageChange: (page: number) => void;
  label: string;
  scrollTarget: string;
  query: {
    data?: { pages: { nextCursor: string | null }[] };
    isFetching: boolean;
    fetchNextPage: () => Promise<{
      isError: boolean;
      data?: { pages: { nextCursor: string | null }[] };
    }>;
  };
}) {
  const [findingLast, setFindingLast] = useState(false);
  const busy = query.isFetching || findingLast;
  const pages = query.data?.pages ?? [];
  const count = pages.length + Number(Boolean(pages.at(-1)?.nextCursor));
  if (count <= 1) return null;

  async function change(next: number) {
    if (next >= pages.length && (await query.fetchNextPage()).isError) return;

    onPageChange(next);
    requestAnimationFrame(() =>
      document.getElementById(scrollTarget)?.scrollIntoView({ block: "start" }),
    );
  }

  async function last() {
    setFindingLast(true);

    try {
      let loaded = pages;

      while (loaded.at(-1)?.nextCursor) {
        const result = await query.fetchNextPage();
        if (result.isError || !result.data || result.data.pages.length <= loaded.length) return;

        loaded = result.data.pages;
      }

      onPageChange(loaded.length - 1);
      requestAnimationFrame(() =>
        document.getElementById(scrollTarget)?.scrollIntoView({ block: "start" }),
      );
    } finally {
      setFindingLast(false);
    }
  }

  const start = Math.max(0, Math.min(page - 2, count - 5));
  const mobileStart = Math.max(0, Math.min(page - 1, count - 3));

  return (
    <nav
      aria-label={label}
      className="my-4 flex flex-wrap items-center justify-center gap-0.5 sm:gap-1"
    >
      <Button
        tone="ghost"
        aria-label="第一页"
        title="第一页"
        disabled={page === 0 || busy}
        onClick={() => void change(0)}
      >
        <ChevronsLeft size={16} />
      </Button>
      <Button
        tone="ghost"
        aria-label="上一页"
        disabled={page === 0 || busy}
        onClick={() => void change(page - 1)}
      >
        <ChevronLeft size={16} />
      </Button>
      {Array.from({ length: Math.min(5, count) }, (_, index) => start + index).map((index) => (
        <Button
          key={index}
          tone="ghost"
          aria-label={`第 ${index + 1} 页`}
          aria-current={page === index ? "page" : undefined}
          className={cn(
            "min-w-8 !rounded-md tabular-nums",
            page === index && "bg-neutral-100 !text-accent",
            (index < mobileStart || index >= mobileStart + 3) && "hidden sm:inline-flex",
          )}
          disabled={busy}
          onClick={() => void change(index)}
        >
          {index + 1}
        </Button>
      ))}
      <Button
        tone="ghost"
        aria-label="下一页"
        disabled={page + 1 >= count || busy}
        onClick={() => void change(page + 1)}
      >
        <ChevronRight size={16} />
      </Button>
      <Button
        tone="ghost"
        aria-label="最后一页"
        title="最后一页"
        disabled={page + 1 >= count || busy}
        onClick={() => void last()}
      >
        <ChevronsRight size={16} />
      </Button>
    </nav>
  );
}

export function Button({
  tone = "primary",
  className,
  ...props
}: Omit<BaseButton.Props, "className"> & {
  tone?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <BaseButton
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition disabled:opacity-50",
        {
          primary:
            "border border-neutral-800 bg-neutral-800 text-white shadow-sm hover:bg-neutral-700",
          secondary:
            "border border-neutral-200 bg-white text-ink shadow-sm hover:border-neutral-300 hover:bg-neutral-50",
          ghost: "!min-h-8 rounded-lg !px-2 text-muted hover:bg-neutral-100 hover:text-accent",
        }[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Choice<Value extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: Value;
  items: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <Select.Trigger
        aria-label={label}
        className="inline-flex h-10 min-w-32 items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-ink shadow-xs outline-none transition hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-accent/25 data-popup-open:border-accent/50"
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={14} className="text-muted" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={7}
          align="start"
          alignItemWithTrigger={false}
          className="z-60 outline-none"
        >
          <Select.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_12px_40px_-8px_#25232b30] outline-none transition-[opacity,transform] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0">
            <Select.List className="max-h-64 overflow-y-auto">
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className="flex min-h-9 cursor-default items-center gap-3 rounded-lg py-2 pr-4 pl-2 text-xs outline-none select-none data-highlighted:bg-neutral-100 data-highlighted:text-accent"
                >
                  <span className="size-4">
                    <Select.ItemIndicator className="text-accent">
                      <Check size={14} />
                    </Select.ItemIndicator>
                  </span>
                  <Select.ItemText>{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
