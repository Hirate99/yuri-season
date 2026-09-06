import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { page } from "@/lib/ui";
import { LockKeyhole, Pin } from "lucide-react";

export const field =
  "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-accent/60 focus:ring-3 focus:ring-accent/10";

export function CommunityFrame({
  children,
  fill = false,
}: {
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div
        className={`${page} !max-w-[960px] !pt-9 md:!pt-12 ${fill ? "flex min-h-[calc(100dvh-4rem)] flex-col" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export function FormError({ error }: { error?: { message?: string } | null }) {
  return error ? (
    <p role="alert" className="my-3 text-sm text-rose-700">
      {error.message || "请求失败，请稍后重试。"}
    </p>
  ) : null;
}

export function LoginPrompt() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-3">
      <p className="text-sm text-muted">登录后可参与讨论</p>
      <Link
        className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-neutral-50"
        to="/account"
        search={{ returnTo: typeof window === "undefined" ? undefined : window.location.pathname }}
      >
        登录
      </Link>
    </div>
  );
}

export function PostTime({ value }: { value: number }) {
  return (
    <time dateTime={new Date(value).toISOString()}>
      {new Date(value).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}

export function ThreadBadges({
  thread,
}: {
  thread: { pinned: boolean; locked: boolean; spoiler: boolean; episode: number | null };
}) {
  return (
    <span className="inline-flex flex-wrap gap-1.5 text-[10px] font-semibold leading-5">
      {thread.pinned && (
        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 text-accent">
          <Pin size={10} />
          置顶
        </span>
      )}
      {thread.episode && (
        <span className="rounded-md bg-neutral-100 px-2 text-muted">第 {thread.episode} 话</span>
      )}
      {thread.spoiler && (
        <span className="rounded-md bg-[#fff2df] px-2 text-[#9b712e]">含剧透</span>
      )}
      {thread.locked && (
        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 text-muted">
          <LockKeyhole size={10} />
          已锁定
        </span>
      )}
    </span>
  );
}
