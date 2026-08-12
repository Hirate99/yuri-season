import { ArrowUpRight, Undo2 } from "lucide-react";
import { useState } from "react";
import type { AdminPublication } from "@/domain";
import { Badge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { dateTime } from "@/lib/format";

export function PublicationList({ publications, busyId, onWithdraw }: {
  publications: AdminPublication[];
  busyId: string | null;
  onWithdraw: (candidateId: string, reason: string) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (publications.length === 0) return <EmptyState title="暂无已发布动态" detail="" />;

  const close = () => {
    setOpenId(null);
    setReason("");
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {publications.map((item) => (
        <article className="rounded-2xl bg-raised p-4.5" key={item.id}>
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.autoPublished ? "blue" : "neutral"}>{item.autoPublished ? "自动" : "手动"}</Badge>
                <span className="text-[10px] text-muted">{item.animeTitle ?? "未关联"}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold leading-6">
                <a className="inline-flex items-start gap-1" href={item.url} target="_blank" rel="noreferrer">
                  {item.title}<ArrowUpRight className="mt-1 shrink-0" size={14} />
                </a>
              </h3>
              <p className="mt-2 text-[10px] text-muted">{item.sourceName} · {dateTime(item.publishedAt)}</p>
            </div>
            <button
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-[10px] font-bold shadow-sm"
              onClick={() => openId === item.id ? close() : (setOpenId(item.id), setReason(""))}
            ><Undo2 size={13} />撤回</button>
          </header>
          {openId === item.id && (
            <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={async (event) => {
              event.preventDefault();
              if (!reason.trim()) return;
              await onWithdraw(item.candidateId, reason.trim());
              close();
            }}>
              <input
                className="min-w-0 flex-1 rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-xs outline-none focus:border-black/25"
                maxLength={300}
                placeholder="撤回原因"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                autoFocus
              />
              <button className="rounded-xl bg-charcoal px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40" disabled={!reason.trim() || busyId === item.candidateId}>确认撤回</button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
