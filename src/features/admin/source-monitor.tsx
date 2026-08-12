import { ArrowUpRight, CircleCheck, CircleX } from "lucide-react";
import type { SourceHealth } from "@/domain";
import { Badge } from "@/components/badge";
import { relativeTime } from "@/lib/format";

const cadenceLabel = { rapid: "按需快速", standard: "常规", local: "仅本地" };
const purposeLabel = { catalog_metadata: "资料核对", feed_candidate: "动态候选" };

export function SourceMonitor({ sources }: { sources: SourceHealth[] }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sources.map((source) => (
    <article className="border border-line bg-raised p-4.5" key={source.id}>
      <header className="flex justify-between"><span className={source.failureCount > 0 ? "text-[#9a324d]" : "text-[#55952b]"}>{source.failureCount > 0 ? <CircleX size={17} /> : <CircleCheck size={17} />}</span><Badge>{cadenceLabel[source.cadenceProfile]}</Badge></header>
      <h3 className="mt-5 text-sm font-bold"><a className="inline-flex items-center gap-1" href={source.url} target="_blank" rel="noreferrer">{source.label}<ArrowUpRight size={14} /></a></h3>
      <p className="mt-1.5 text-[10px] text-muted">{source.animeTitle ?? "全局来源"}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-4">{[["用途", purposeLabel[source.changeKind]], ["可信级别", source.trustLevel], ["上次检查", relativeTime(source.lastCheckedAt)], ["连续失败", source.failureCount]].map(([label, value]) => <div key={label}><dt className="text-[8px] text-muted">{label}</dt><dd className="mt-1 text-[9px] font-bold">{value}</dd></div>)}</dl>
      {source.lastError && <small className="mt-3 block text-[9px] text-[#9a324d]">{source.lastError}</small>}
    </article>
  ))}</div>;
}
