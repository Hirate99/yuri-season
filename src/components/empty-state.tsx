import { CircleAlert } from "lucide-react";

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-raised p-5 text-muted">
      <CircleAlert size={20} aria-hidden="true" />
      <div>
        <strong className="text-sm text-ink">{title}</strong>
        {detail && <p className="mt-1 text-xs leading-6">{detail}</p>}
      </div>
    </div>
  );
}

export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="grid animate-pulse gap-2.5" aria-label="正在加载">
      {Array.from({ length: count }, (_, index) => (
        <span className="h-18 rounded-2xl bg-[#f0f1f3]" key={index} />
      ))}
    </div>
  );
}
