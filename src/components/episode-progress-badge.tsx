export function EpisodeProgressBadge({ episode }: { episode: number | null | undefined }) {
  if (!episode) return null;

  return (
    <span className="inline-flex shrink-0 text-xs font-medium tabular-nums text-accent">
      更新至 {episode} 话
    </span>
  );
}
