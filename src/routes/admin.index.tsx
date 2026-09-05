import { AdminOverview } from "@/features/admin/admin-overview";
import { overviewQuery, summaryQuery } from "@/features/admin/queries";
import { QueryStatus } from "@/features/admin/query-status";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({ component: Overview });
function Overview() {
  const query = useQuery(overviewQuery), summary = useQuery(summaryQuery);
  return <><QueryStatus query={query} />{query.data && summary.data && <AdminOverview data={{ ...query.data, ...summary.data }} />}</>;
}
