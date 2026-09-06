import { cn } from "@/lib/ui";
import { Link } from "@tanstack/react-router";
import { Activity, BookOpen, ClipboardCheck, Database, Gauge, Layers3, MessagesSquare } from "lucide-react";

export const adminAreas = [
  { id: "overview", to: "/admin", label: "概览", Icon: Gauge },
  { id: "review", to: "/admin/review", label: "审核", Icon: ClipboardCheck },
  { id: "community", to: "/admin/community", label: "社区", Icon: MessagesSquare },
  { id: "works", to: "/admin/works", label: "作品", Icon: BookOpen },
  { id: "coverage", to: "/admin/coverage", label: "覆盖", Icon: Database },
  { id: "automation", to: "/admin/automation", label: "自动化", Icon: Activity },
  { id: "seasons", to: "/admin/seasons", label: "季度", Icon: Layers3 },
] as const;

export function AdminNavigation({ heldCount }: { heldCount: number }) {
  return (
    <aside className="border-b border-black/[0.05] bg-white/85 px-4 py-4 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:px-3 md:py-6">
      <div className="flex items-center justify-between px-2 md:block"><div><strong className="text-sm tracking-tight">YuriSeason</strong><p className="mt-0.5 text-[9px] text-muted">Admin</p></div><a className="text-[10px] text-muted md:hidden" href="/cdn-cgi/access/logout">退出</a></div>
      <nav className="mt-4 flex gap-1 overflow-x-auto md:mt-8 md:grid" aria-label="Admin 工作区">
        {adminAreas.map(({ id, to, label, Icon }) => <Link className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-muted transition hover:bg-[#f5f6f7] hover:text-ink" activeProps={{ className: "bg-[#eeeafd] !text-[#51459d]" }} activeOptions={{ exact: true }} key={id} to={to}><Icon size={15} />{label}{id === "review" && heldCount > 0 && <span className="ml-auto rounded-full bg-[#786bd1] px-1.5 py-0.5 text-[8px] text-white">{heldCount}</span>}</Link>)}
      </nav>
      <a className="absolute bottom-6 left-5 hidden text-[10px] text-muted md:block" href="/cdn-cgi/access/logout">退出登录</a>
    </aside>
  );
}

export function AdminSegments<T extends string>({ value, items, onChange }: { value: T; items: Array<{ id: T; label: string; count?: number }>; onChange: (value: T) => void }) {
  return <div className="mb-5 flex w-max max-w-full gap-1 overflow-x-auto rounded-2xl bg-[#eceef1] p-1">{items.map((item) => <button className={cn("whitespace-nowrap rounded-xl px-3.5 py-2 text-[10px] font-semibold text-muted", value === item.id && "bg-white text-ink shadow-sm")} key={item.id} onClick={() => onChange(item.id)}>{item.label}{item.count ? ` ${item.count}` : ""}</button>)}</div>;
}
