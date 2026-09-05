import { Badge } from "@/components/badge";
import { EmptyState, LoadingRows } from "@/components/empty-state";
import { VirtualWindowGrid } from "@/components/virtual-window-grid";
import type { SearchMemorySummary } from "@/domain";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { memoryQuery } from "./queries";

type View = "recent" | "useful" | "attention";

const views: Array<{ id: View; label: string }> = [
  { id: "recent", label: "最近" },
  { id: "useful", label: "有产出" },
  { id: "attention", label: "需处理" },
];

const kindLabels: Record<SearchMemorySummary["searchKind"], string> = {
  registered_source: "已登记来源",
  official_news: "公式来源",
  social: "SNS",
  birthday: "生日",
  media: "图片 / 创作",
  community: "讨论",
  catalog: "目录",
};

function statusPresentation(status: SearchMemorySummary["status"]) {
  if (status === "blocked") return { label: "受阻", tone: "rose" as const };
  if (status === "exhausted") return { label: "暂无线索", tone: "neutral" as const };
  return { label: "继续监控", tone: "blue" as const };
}

function hasUsefulResult(record: SearchMemorySummary) {
  return record.usefulResultCount > 0 || record.publishedCount > 0
    || record.heldCount > 0 || record.candidateCount > 0;
}

export function SearchMemoryMonitor() {
  const memory = useQuery(memoryQuery);
  const [view, setView] = useState<View>("recent");
  const records = memory.data?.records ?? [];
  const usefulCount = records.filter(hasUsefulResult).length;
  const attentionCount = records.filter((record) => record.status === "blocked").length;
  const dueCount = records.filter((record) => record.nextSearchAt
    && Date.parse(record.nextSearchAt) <= Date.now()).length;
  const filtered = useMemo(() => records.filter((record) => {
    if (view === "useful") return hasUsefulResult(record);
    if (view === "attention") return record.status === "blocked";
    return true;
  }), [records, view]);

  if (memory.isPending) return <LoadingRows count={6} />;
  if (memory.error) return <EmptyState title="检索记录加载失败" detail={memory.error.message} />;

  return (
    <div className="grid gap-6">
      <section className="grid grid-cols-3 gap-2">
        {[["记录", records.length], ["有产出", usefulCount], ["已到期", dueCount]].map(([label, value]) => (
          <article className="rounded-2xl bg-raised p-4" key={label}>
            <p className="text-[9px] text-muted">{label}</p>
            <strong className="mt-2 block text-xl tracking-tight">{value}</strong>
          </article>
        ))}
      </section>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-xl bg-raised p-1" aria-label="筛选检索记录">
          {views.map((item) => (
            <button
              key={item.id}
              className={cn("rounded-lg px-3 py-2 text-[10px] font-semibold text-muted", view === item.id && "bg-white text-ink shadow-sm")}
              onClick={() => setView(item.id)}
            >{item.label}{item.id === "attention" && attentionCount > 0 ? ` ${attentionCount}` : ""}</button>
          ))}
        </div>
        <span className="text-[9px] text-muted">{filtered.length} 条</span>
      </div>

      {filtered.length === 0 ? <EmptyState title={view === "attention" ? "没有受阻的检索" : "暂无检索记录"} /> : (
        <VirtualWindowGrid
          items={filtered}
          getKey={(record) => record.id}
          estimateRowSize={225}
          renderItem={(record) => {
            const status = statusPresentation(record.status);
            return (
              <article className="rounded-2xl bg-raised p-4" key={record.id}>
                <header className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Badge>{kindLabels[record.searchKind]}</Badge>
                    <strong className="mt-2 block break-words text-xs leading-5">{record.queryText}</strong>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </header>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-muted">
                  <span>命中 {record.lastResultCount}</span>
                  <span>有效 {record.usefulResultCount}</span>
                  {record.publishedCount > 0 && <span>已发布 {record.publishedCount}</span>}
                  {record.heldCount > 0 && <span>待复核 {record.heldCount}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-muted">
                  <time>检查 {dateTime(record.searchedAt)}</time>
                  {record.nextSearchAt && <time>下次 {dateTime(record.nextSearchAt)}</time>}
                </div>
                {record.notes && <p className="mt-3 line-clamp-2 text-[9px] leading-5 text-muted">{record.notes}</p>}
              </article>
            );
          }}
        />
      )}
    </div>
  );
}
