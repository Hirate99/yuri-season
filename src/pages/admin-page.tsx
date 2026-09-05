import { useState } from "react";
import type { AdminDashboard, AnimeCreate, AnimePatch, ReviewDecision } from "@/domain";
import { EmptyState, LoadingRows } from "@/components/empty-state";
import { AdminOverview, type AdminArea } from "@/features/admin/admin-overview";
import { adminAreas, AdminNavigation, AdminSegments } from "@/features/admin/admin-navigation";
import { BatchImporter } from "@/features/admin/batch-importer";
import { ReviewQueue } from "@/features/admin/review-queue";
import { RunMonitor } from "@/features/admin/run-monitor";
import { SourceMonitor } from "@/features/admin/source-monitor";
import { SeasonsEditor } from "@/features/admin/seasons-editor";
import { WorksPanel } from "@/features/admin/works-panel";
import { PublicationList } from "@/features/admin/publication-list";
import { AuditTrail } from "@/features/admin/audit-trail";
import { SearchMemoryMonitor } from "@/features/admin/search-memory-monitor";
import { CoveragePanel } from "@/features/admin/coverage-panel";
import { apiClient, rpcData, useApi } from "@/lib/api";

type ReviewView = "inbox" | "published";
type AutomationView = "runs" | "search" | "sources" | "import";

export function AdminPage() {
  const [area, setArea] = useState<AdminArea>("overview");
  const [reviewView, setReviewView] = useState<ReviewView>("inbox");
  const [automationView, setAutomationView] = useState<AutomationView>("runs");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const dashboard = useApi<AdminDashboard>((signal) =>
    rpcData(apiClient.api.admin.dashboard.$get({ query: { view: area } }, { init: { signal } })), [area]);

  const decide = async (id: string, decision: ReviewDecision, reason?: string) => {
    setBusyId(id); setActionError(null);
    try {
      await rpcData(apiClient.api.admin.candidates[":id"].decision.$post({
        param: { id }, json: { decision, reason: reason ?? "" },
      }));
      dashboard.reload();
    }
    catch (error) { setActionError(error instanceof Error ? error.message : String(error)); }
    finally { setBusyId(null); }
  };
  const patchWork = async (id: string, patch: AnimePatch) => {
    setBusyId(id); setActionError(null);
    try {
      await rpcData(apiClient.api.admin.anime[":id"].$patch({ param: { id }, json: patch }));
      dashboard.reload();
    }
    catch (error) { setActionError(error instanceof Error ? error.message : String(error)); }
    finally { setBusyId(null); }
  };
  const createWork = async (value: AnimeCreate) => {
    setBusyId("new-work"); setActionError(null);
    try {
      await rpcData(apiClient.api.admin.anime.$post({ json: value }));
      dashboard.reload();
    }
    catch (error) { setActionError(error instanceof Error ? error.message : String(error)); throw error; }
    finally { setBusyId(null); }
  };

  if (dashboard.loading) return <div className="mx-auto max-w-7xl p-6"><LoadingRows count={5} /></div>;
  if (!dashboard.data) return <div className="mx-auto max-w-3xl p-6"><EmptyState title="无法进入 Admin" detail={dashboard.error ?? "身份验证失败"} /><a className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold" href="/admin">重新验证</a></div>;
  const data = dashboard.data;

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1540px] md:grid-cols-[190px_minmax(0,1fr)]">
      <AdminNavigation area={area} heldCount={data.counts.held} onChange={setArea} />

      <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 md:px-8 md:pt-9 xl:px-12">
        <header className="mb-7 flex items-end justify-between gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#786bd1]">Workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{adminAreas.find((item) => item.id === area)?.label}</h1></div><span className="text-[10px] text-muted">{data.seasons.find((season) => season.isCurrent)?.label}</span></header>
        {dashboard.refreshing && <p className="mb-3 text-xs text-muted" role="status">正在更新…</p>}{dashboard.error && <p className="mb-3 text-sm text-muted" role="alert">刷新失败：{dashboard.error}</p>}{actionError && <p className="mb-5 rounded-2xl bg-[#fce8ef] p-3 text-xs text-[#7d263f]">{actionError}</p>}
        {area === "overview" && <AdminOverview data={data} onNavigate={setArea} />}
        {area === "review" && <><AdminSegments value={reviewView} onChange={setReviewView} items={[{ id: "inbox", label: "待复核", count: data.counts.held }, { id: "published", label: "已发布" }]} />{reviewView === "inbox" ? <ReviewQueue candidates={data.heldCandidates} busyId={busyId} onDecision={decide} /> : <PublicationList publications={data.recentPublications} busyId={busyId} onWithdraw={(id, reason) => decide(id, "withdraw", reason)} />}</>}
        {area === "works" && <WorksPanel anime={data.anime} seasons={data.seasons} busyId={busyId} onPatch={patchWork} onCreate={createWork} />}
        {area === "coverage" && <CoveragePanel items={data.coverage} seasons={data.seasons} />}
        {area === "automation" && <><AdminSegments value={automationView} onChange={setAutomationView} items={[{ id: "runs", label: "运行" }, { id: "search", label: "检索记忆" }, { id: "sources", label: "来源" }, { id: "import", label: "导入" }]} />{automationView === "runs" && <div className="grid gap-8"><RunMonitor runs={data.recentRuns} jobs={data.recentJobs} /><AuditTrail entries={data.recentAudit} /></div>}{automationView === "search" && <SearchMemoryMonitor />}{automationView === "sources" && <SourceMonitor sources={data.sources} />}{automationView === "import" && <BatchImporter onImported={dashboard.reload} />}</>}
        {area === "seasons" && <SeasonsEditor seasons={data.seasons} onChanged={dashboard.reload} />}
      </main>
    </div>
  );
}
