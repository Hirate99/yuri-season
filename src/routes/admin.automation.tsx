import { AdminSegments } from "@/features/admin/admin-navigation";
import { AuditTrail } from "@/features/admin/audit-trail";
import { BatchImporter } from "@/features/admin/batch-importer";
import { automationQuery } from "@/features/admin/queries";
import { QueryStatus } from "@/features/admin/query-status";
import { RunMonitor } from "@/features/admin/run-monitor";
import { SearchMemoryMonitor } from "@/features/admin/search-memory-monitor";
import { SourceMonitor } from "@/features/admin/source-monitor";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

const views = [
  { id: "runs", label: "运行" },
  { id: "search", label: "检索记忆" },
  { id: "sources", label: "来源" },
  { id: "import", label: "导入" },
] as const;
type View = (typeof views)[number]["id"];
export const Route = createFileRoute("/admin/automation")({
  validateSearch: (search: Record<string, unknown>): { view?: View } => ({
    view: views.find((view) => view.id === search.view)?.id ?? "runs",
  }),
  component: Automation,
});

function Automation() {
  const { view = "runs" } = Route.useSearch(),
    navigate = Route.useNavigate();

  const query = useQuery({ ...automationQuery, enabled: view === "runs" || view === "sources" });

  return (
    <>
      <AdminSegments
        value={view}
        onChange={(view) => void navigate({ search: { view } })}
        items={[...views]}
      />
      {(view === "runs" || view === "sources") && <QueryStatus query={query} />}
      {view === "runs" && query.data && (
        <div className="grid gap-8">
          <RunMonitor runs={query.data.recentRuns} jobs={query.data.recentJobs} />
          <AuditTrail entries={query.data.recentAudit} />
        </div>
      )}
      {view === "sources" && query.data && <SourceMonitor sources={query.data.sources} />}
      {view === "search" && <SearchMemoryMonitor />}
      {view === "import" && <BatchImporter />}
    </>
  );
}
