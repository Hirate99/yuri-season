import type { AuditEntry } from "@/domain";
import { Badge } from "@/components/badge";
import { dateTime } from "@/lib/format";

const actionLabel: Record<string, string> = {
  create_anime: "新增作品",
  update_anime: "修改作品",
  remove_anime: "移出目录",
  create_resource: "新增资料",
  update_resource: "修改资料",
  delete_resource: "删除资料",
  create_season: "新增季度",
  update_season: "修改季度",
  review_candidate: "审核动态",
  import_batch: "导入批次",
  complete_job: "完成任务",
};

function auditNote(entry: AuditEntry): string | null {
  const reason = entry.detail.reason;
  if (typeof reason === "string") return reason;
  const decision = entry.detail.decision;
  if (typeof decision === "string") return decision;
  const note = entry.detail.note;
  return typeof note === "string" ? note : null;
}

export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold">审计</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map((entry) => {
          const note = auditNote(entry);
          return (
            <article className="rounded-2xl bg-raised px-4 py-3.5" key={entry.id}>
              <div className="flex items-center justify-between gap-3">
                <strong className="text-xs">{actionLabel[entry.action] ?? entry.action}</strong>
                <Badge>{entry.actorType}</Badge>
              </div>
              <p className="mt-2 truncate text-[10px] text-muted">{entry.entityType} · {entry.entityId}</p>
              {note && <p className="mt-2 text-[10px] text-ink">{note}</p>}
              <time className="mt-2 block text-[9px] text-muted">{dateTime(entry.createdAt)}</time>
            </article>
          );
        })}
      </div>
    </section>
  );
}
