import { useViewerTimeZone } from "@/hooks/use-viewer-timezone";
import { dateTime } from "@/lib/format";

export function LocalDateTime({ value, className }: { value: string | null; className?: string }) {
  const viewerTimeZone = useViewerTimeZone();
  return <time className={className} dateTime={value ?? undefined}>{dateTime(value, viewerTimeZone ?? "Asia/Tokyo")}</time>;
}
