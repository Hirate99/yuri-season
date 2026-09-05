import { useQuery } from "@tanstack/react-query";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { AdminNavigation, adminAreas } from "./admin-navigation";
import { summaryQuery } from "./queries";
import { QueryStatus } from "./query-status";

export function AdminLayout() {
  const summary = useQuery(summaryQuery);
  const path = useRouterState({ select: state => state.location.pathname.replace(/\/$/, "") });
  return <div className="mx-auto grid min-h-screen w-full max-w-[1540px] md:grid-cols-[190px_minmax(0,1fr)]">
    <AdminNavigation heldCount={summary.data?.counts.held ?? 0} />
    <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 md:px-8 md:pt-9 xl:px-12">
      <header className="mb-7 flex items-end justify-between gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#786bd1]">Workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{adminAreas.find(area => area.to === path)?.label}</h1></div><span className="text-[10px] text-muted">{summary.data?.seasons.find(season => season.isCurrent)?.label}</span></header>
      <QueryStatus query={summary} />
      {summary.data && <Outlet />}
    </main>
  </div>;
}
