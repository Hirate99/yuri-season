import { summaryQuery, worksQuery } from "@/features/admin/queries";
import { QueryStatus } from "@/features/admin/query-status";
import { WorksPanel } from "@/features/admin/works-panel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/works")({ component: Works });
function Works() {
  const query = useQuery(worksQuery), summary = useQuery(summaryQuery);
  return <><QueryStatus query={query} />{query.data && summary.data && <WorksPanel anime={query.data} seasons={summary.data.seasons} />}</>;
}
