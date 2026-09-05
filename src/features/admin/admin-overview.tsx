import type { AdminDashboard } from "@/domain";
import { coverageChecks } from "@/domain/coverage";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, CheckCircle2, Database, Inbox, RadioTower } from "lucide-react";

export function AdminOverview({ data }: { data: Pick<AdminDashboard, "counts" | "seasons" | "coverage" | "sources" | "recentRuns" | "recentJobs"> }) {
  const sourceErrors = data.sources.filter((source) => source.failureCount > 0).length;
  const currentSeason = data.seasons.find((season) => season.isCurrent);
  const currentCoverage = data.coverage.filter((item) => !currentSeason || item.seasonId === currentSeason.id);
  const incompleteWorks = currentCoverage.filter(item => coverageChecks(item).some(check => !check.ready)).length;
  const failedRuns = data.recentRuns.filter((run) => run.status === "failed").length;
  const blockedJobs = data.recentJobs.filter((job) => job.status === "dead" || job.status === "retry").length;
  const actions = [
    { label: "待复核", count: data.counts.held, detail: "候选动态", to: "/admin/review" as const, Icon: Inbox },
    { label: "来源异常", count: sourceErrors, detail: "抓取来源", to: "/admin/automation" as const, Icon: RadioTower },
    { label: "资料未齐", count: incompleteWorks, detail: currentSeason?.label ?? "当前季度", to: "/admin/coverage" as const, Icon: Database },
    { label: "运行异常", count: failedRuns + blockedJobs, detail: "批次与任务", to: "/admin/automation" as const, Icon: AlertCircle },
  ];

  return (
    <div className="grid gap-7">
      <section>
        <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold text-[#786bd1]">TODAY</p><h2 className="mt-1 text-xl font-bold tracking-tight">需要处理</h2></div><span className="text-[10px] text-muted">{currentSeason?.label}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map(({ label, count, detail, to, Icon }) => (
            <Link className="group rounded-3xl border border-black/[0.06] bg-white p-5 text-left shadow-[0_12px_40px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]" key={label} to={to}>
              <div className="flex items-start justify-between"><Icon className={count > 0 ? "text-[#786bd1]" : "text-[#65a47a]"} size={18} />{count === 0 && <CheckCircle2 className="text-[#65a47a]" size={15} />}</div>
              <strong className="mt-6 block text-3xl tracking-tight">{count}</strong>
              <span className="mt-1 flex items-center justify-between text-xs font-semibold">{label}<ArrowRight className="opacity-0 transition group-hover:opacity-100" size={14} /></span>
              <span className="mt-1 block text-[9px] text-muted">{detail}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between"><h3 className="text-sm font-bold">最近运行</h3><Link className="text-[10px] font-semibold text-[#665ab1]" to="/admin/automation">全部</Link></div>
          <div className="mt-4 grid gap-2">
            {data.recentRuns.slice(0, 4).map((run) => <div className="flex items-center justify-between rounded-2xl bg-[#f7f8fa] px-4 py-3" key={run.id}><div><strong className="text-xs">{run.triggerType}</strong><p className="mt-1 text-[9px] text-muted">来源 {run.sourceCount} · 候选 {run.candidateCount} · 发布 {run.publishedCount}</p></div><span className={run.status === "failed" ? "text-[9px] font-bold text-[#a23f5e]" : "text-[9px] font-bold text-[#4e805f]"}>{run.status}</span></div>)}
            {data.recentRuns.length === 0 && <p className="py-8 text-center text-xs text-muted">暂无运行记录</p>}
          </div>
        </article>
        <article className="rounded-3xl bg-[#1c1d22] p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <p className="text-[10px] text-white/55">CATALOG</p><strong className="mt-3 block text-3xl">{data.counts.anime}</strong><p className="mt-1 text-xs text-white/70">登记作品</p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-[10px]"><div className="rounded-2xl bg-white/[0.08] p-3"><strong className="block text-lg">{data.counts.sources}</strong><span className="text-white/55">启用来源</span></div><div className="rounded-2xl bg-white/[0.08] p-3"><strong className="block text-lg">{data.counts.activeDiscussions}</strong><span className="text-white/55">讨论串</span></div></div>
        </article>
      </section>
    </div>
  );
}
