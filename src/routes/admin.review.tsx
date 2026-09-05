import type { ReviewDecision } from "@/domain";
import { AdminSegments } from "@/features/admin/admin-navigation";
import { PublicationList } from "@/features/admin/publication-list";
import { decisionMutation, reviewQuery, summaryQuery } from "@/features/admin/queries";
import { QueryStatus } from "@/features/admin/query-status";
import { ReviewQueue } from "@/features/admin/review-queue";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/review")({
  validateSearch: (search: Record<string, unknown>): { view?: "inbox" | "published" } => ({ view: search.view === "published" ? "published" : "inbox" }),
  component: Review,
});
function Review() {
  const { view = "inbox" } = Route.useSearch(), navigate = Route.useNavigate();
  const query = useQuery(reviewQuery), mutation = useMutation(decisionMutation);
  const summary = useQuery(summaryQuery);
  const busyId = mutation.isPending ? mutation.variables.id : null;
  const decide = async (id: string, decision: ReviewDecision, reason?: string) => { mutation.mutate({ id, decision, reason }); };
  return <><QueryStatus query={query} />
    {mutation.error && <p role="alert" className="mb-3 text-xs text-[#8b3048]">{mutation.error.message}</p>}
    <AdminSegments value={view} onChange={view => void navigate({ search: { view } })} items={[{ id: "inbox", label: "待复核", count: summary.data?.counts.held }, { id: "published", label: "已发布" }]} />
    {query.data && (view === "inbox" ? <ReviewQueue candidates={query.data.heldCandidates} busyId={busyId} onDecision={decide} /> : <PublicationList publications={query.data.recentPublications} busyId={busyId} onWithdraw={(id, reason) => decide(id, "withdraw", reason)} />)}
  </>;
}
