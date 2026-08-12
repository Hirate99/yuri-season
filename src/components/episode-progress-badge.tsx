export function EpisodeProgressBadge({ episode }: { episode: number | null | undefined }) {
  if (!episode) return null;
  return (
    <span className="inline-flex shrink-0 rounded-full bg-[#f0efff] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#6759bd]">
      更新至 {episode} 话
    </span>
  );
}
