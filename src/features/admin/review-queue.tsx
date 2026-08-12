import { useState } from "react";
import { ArrowUpRight, Check, ShieldAlert, X } from "lucide-react";
import type { FeedCandidate, ReviewDecision } from "@/domain";
import { Badge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { contentLabel, dateTime } from "@/lib/format";

function fallbackReasons(candidate: FeedCandidate): string[] {
  const reasons: string[] = [];
  if (candidate.evidenceCount === 0) reasons.push("没有关联证据记录");
  if (candidate.safetyRating === "unknown") reasons.push("安全分级未确认");
  if (candidate.sourceIdentity === "community") reasons.push("社区来源需要人工判断");
  if (candidate.confidence < 0.92) reasons.push("置信度未达到自动发布阈值");
  return reasons;
}

export function ReviewQueue({ candidates, busyId, onDecision }: {
  candidates: FeedCandidate[];
  busyId: string | null;
  onDecision: (id: string, decision: ReviewDecision, reason?: string) => void;
}) {
  const [reason, setReason] = useState<Record<string, string>>({});
  if (candidates.length === 0) return <EmptyState title="待复核已清空" />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {candidates.map((candidate) => {
        const reasons = candidate.reviewReasons.length > 0 ? candidate.reviewReasons : fallbackReasons(candidate);
        return (
          <article className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,0.05)]" key={candidate.id}>
            <header className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2"><Badge tone="amber">待复核</Badge><Badge>{contentLabel(candidate.contentClass)}</Badge></div>
              <span className="text-[10px] tabular-nums text-muted">{Math.round(candidate.confidence * 100)}%</span>
            </header>
            <h3 className="mt-4 text-base font-bold leading-6"><a className="inline-flex items-start gap-1" href={candidate.url} target="_blank" rel="noreferrer">{candidate.title}<ArrowUpRight className="mt-1 shrink-0" size={14} /></a></h3>
            <p className="mt-2 text-xs leading-6 text-muted">{candidate.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5 text-[9px]">
              {[candidate.animeTitle, candidate.characterName, candidate.personName, candidate.sourceAccount].filter(Boolean).map((item) => <span className="rounded-full bg-[#f4f5f7] px-2.5 py-1.5" key={item}>{item}</span>)}
            </div>
            {reasons.length > 0 && <div className="mt-4 rounded-2xl bg-[#fff7e8] px-3.5 py-3 text-[10px] leading-5 text-[#7b581d]"><p className="flex items-center gap-1.5 font-bold"><ShieldAlert size={13} />需要判断</p><p className="mt-1">{reasons.join(" · ")}</p></div>}
            <dl className="mt-4 grid grid-cols-3 gap-3 text-[9px]"><div><dt className="text-muted">来源</dt><dd className="mt-1 font-semibold">{candidate.sourceName}</dd></div><div><dt className="text-muted">证据</dt><dd className="mt-1 font-semibold">{candidate.evidenceCount} 条</dd></div><div><dt className="text-muted">时间</dt><dd className="mt-1 font-semibold">{dateTime(candidate.publishedAt)}</dd></div></dl>
            <input className="mt-4 h-10 w-full rounded-xl bg-[#f4f5f7] px-3 text-xs outline-none focus:ring-3 focus:ring-[#786bd1]/10" maxLength={300} placeholder="处理备注（拒绝时建议填写）" value={reason[candidate.id] ?? ""} onChange={(event) => setReason((value) => ({ ...value, [candidate.id]: event.target.value }))} />
            <footer className="mt-3 flex justify-end gap-2">
              <button className="inline-flex items-center gap-1 rounded-full bg-[#f4f5f7] px-3.5 py-2.5 text-[10px] font-bold text-[#8c3d55]" disabled={busyId === candidate.id} onClick={() => onDecision(candidate.id, "reject", reason[candidate.id]?.trim())}><X size={14} />拒绝</button>
              <button className="inline-flex items-center gap-1 rounded-full bg-[#17191c] px-4 py-2.5 text-[10px] font-bold text-white" disabled={busyId === candidate.id} onClick={() => onDecision(candidate.id, "publish", reason[candidate.id]?.trim())}><Check size={14} />发布</button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
