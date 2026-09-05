import { CoveragePanel } from "@/features/admin/coverage-panel";
import { coverageQuery, summaryQuery } from "@/features/admin/queries";
import { QueryStatus } from "@/features/admin/query-status";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/coverage")({ component: Coverage });
function Coverage() {
  const query = useQuery(coverageQuery), summary = useQuery(summaryQuery);
  return <><QueryStatus query={query} />{query.data && summary.data && <CoveragePanel items={query.data} seasons={summary.data.seasons} />}</>;
}
