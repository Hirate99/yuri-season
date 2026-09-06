import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type VirtualWindowGridProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  estimateRowSize?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  wideLanes?: 1 | 2;
};

export function VirtualWindowGrid<T>({
  items,
  getKey,
  renderItem,
  estimateRowSize = 280,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  wideLanes = 1,
}: VirtualWindowGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [lanes, setLanes] = useState(1);
  const loaderIndex = items.length;

  const virtualizer = useWindowVirtualizer({
    count: items.length + (hasMore ? 1 : 0),
    estimateSize: () => estimateRowSize,
    getItemKey: (index) => (index < items.length ? getKey(items[index]) : "loader"),
    gap: 12,
    lanes,
    laneAssignmentMode: "measured",
    overscan: lanes === 1 ? 4 : 8,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const loaderVisible = hasMore && virtualItems.some((item) => item.index === loaderIndex);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const updateLayout = () => {
      setScrollMargin((containerRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY);
      setLanes(window.matchMedia("(min-width: 768px)").matches ? wideLanes : 1);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);

    return () => window.removeEventListener("resize", updateLayout);
  }, [wideLanes, mounted]);

  useEffect(() => {
    if (mounted && loaderVisible && !loadingMore) onLoadMore?.();
  }, [mounted, loaderVisible, loadingMore, onLoadMore]);

  if (!mounted) {
    return (
      <div className={`mt-3 grid gap-3 ${wideLanes === 2 ? "md:grid-cols-2" : ""}`}>
        {items.slice(0, 6).map((item, index) => (
          <div key={getKey(item)}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative mt-3"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualItems.map((virtualItem) => {
        const item = items[virtualItem.index];
        const width = `calc((100% - ${(lanes - 1) * 12}px) / ${lanes})`;
        const x = virtualItem.lane === 0 ? "0px" : "calc(100% + 12px)";

        return (
          <div
            key={virtualItem.key}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            className="absolute top-0 left-0"
            style={{
              width,
              transform: `translate3d(${x}, ${virtualItem.start - scrollMargin}px, 0)`,
            }}
          >
            {item ? (
              renderItem(item, virtualItem.index)
            ) : (
              <div className="grid min-h-20 place-items-center text-xs text-muted" role="status">
                正在加载…
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
