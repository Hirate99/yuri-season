import type { BroadcastSlot } from "@/domain";
import { useViewerTimeZone } from "@/hooks/use-viewer-timezone";
import { localBroadcastDisplay, timeZoneLabel } from "@/lib/timezone";

export function BroadcastTime({ slot, align = "start", viewerTimeZone, now }: {
  slot: Pick<BroadcastSlot, "weekday" | "localTime" | "timezone">;
  align?: "start" | "end";
  viewerTimeZone?: string;
  now?: Date;
}) {
  const detectedTimeZone = useViewerTimeZone();
  const effectiveTimeZone = viewerTimeZone ?? detectedTimeZone;
  const local = effectiveTimeZone && effectiveTimeZone !== slot.timezone
    ? localBroadcastDisplay(slot, effectiveTimeZone, now)
    : null;

  return (
    <span className={align === "end" ? "block text-right" : "block"}>
      <strong className="block text-sm tabular-nums">
        {slot.localTime} <small className="font-medium text-muted">{timeZoneLabel(slot.timezone)}</small>
      </strong>
      {local && (
        <small className="mt-0.5 block whitespace-nowrap text-[9px] font-normal tabular-nums text-muted">
          {local.weekday} {local.time} {local.timezone}
        </small>
      )}
    </span>
  );
}
