import { Popover } from "@base-ui/react/popover";
import { Check, Copy, Rss, X } from "lucide-react";
import { useState } from "react";
import { subscriptionLabel, subscriptionPath, type FeedSearch } from "@/lib/feed-search";
import { pageUrl } from "@/lib/seo";

export function RssSubscribe({
  search = {},
  animeTitle,
}: {
  search?: FeedSearch;
  animeTitle?: string;
}) {
  const url = pageUrl(subscriptionPath(search));
  const [message, setMessage] = useState("");
  return (
    <Popover.Root onOpenChange={() => setMessage("")}>
      <Popover.Trigger
        aria-label="RSS 订阅"
        title="订阅当前情报"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg text-muted transition-colors hover:bg-raised hover:text-accent focus-visible:outline-2 focus-visible:outline-accent data-[popup-open]:bg-accent-soft data-[popup-open]:text-accent md:w-auto md:px-3 md:text-sm"
      >
        <Rss size={18} aria-hidden="true" />
        <span className="hidden md:inline">订阅</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" collisionPadding={12} className="z-50">
          <Popover.Popup className="w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-line bg-white p-4 shadow-xl outline-none">
            <div className="flex items-center justify-between gap-3">
              <Popover.Title className="text-sm font-semibold">订阅图文情报</Popover.Title>
              <Popover.Close
                aria-label="关闭订阅面板"
                className="grid size-8 place-items-center rounded-md text-muted hover:bg-raised"
              >
                <X size={16} />
              </Popover.Close>
            </div>
            <p className="mt-2 text-xs leading-5 text-accent">
              {subscriptionLabel(search, animeTitle)}
            </p>
            <Popover.Description className="mt-2 text-xs leading-5 text-muted">
              将地址添加到 RSS 阅读器，接收正文、图片和来源链接，无需登录。
            </Popover.Description>
            <input
              aria-label="RSS 订阅地址"
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-3 w-full rounded-md border border-line bg-raised px-2 py-2 text-xs outline-accent"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent-soft px-3 text-xs font-semibold text-accent"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setMessage("已复制");
                  } catch {
                    setMessage("复制失败，请选择上方地址手动复制。");
                  }
                }}
              >
                {message === "已复制" ? <Check size={14} /> : <Copy size={14} />}复制地址
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-accent"
              >
                打开订阅源 ↗
              </a>
            </div>
            <p role="status" className="mt-2 min-h-4 text-xs text-muted">
              {message}
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
