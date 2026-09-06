import { ArrowUpRight } from "lucide-react";
import type { AnimeDetail } from "@/domain";
import { relativeTime } from "@/lib/format";

export function DataSources({ anime }: { anime: AnimeDetail }) {
  if (anime.sources.length === 0) return null;

  const correctionUrl = `https://github.com/haonan/yuri/issues/new?title=${encodeURIComponent(`纠错：${anime.titleZh}`)}`;

  return (
    <details className="group rounded-lg bg-raised p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs [&::-webkit-details-marker]:hidden">
        <strong className="text-sm font-semibold">资料</strong>
        <span className="text-xs text-muted">
          {anime.sources.length} 个来源
          {anime.lastCheckedAt ? ` · ${relativeTime(anime.lastCheckedAt)}` : ""}
        </span>
      </summary>
      <div className="mt-3 grid gap-1.5">
        {anime.sources.map((source) => (
          <a
            className="flex items-center justify-between gap-3 py-2 text-xs hover:text-accent"
            href={source.url}
            key={source.id}
            rel="noreferrer"
            target="_blank"
          >
            <span className="min-w-0 truncate">{source.label}</span>
            <ArrowUpRight className="shrink-0 text-muted" size={12} />
          </a>
        ))}
        <a
          className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
          href={correctionUrl}
          rel="noreferrer"
          target="_blank"
        >
          纠错 <ArrowUpRight size={11} />
        </a>
      </div>
    </details>
  );
}
