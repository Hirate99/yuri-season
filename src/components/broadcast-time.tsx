import type { BroadcastSlot } from "@/domain";
import { useViewerTimeZone } from "@/hooks/use-viewer-timezone";
import { weekdayLabel } from "@/lib/format";
import { localBroadcastDisplay, timeZoneLabel } from "@/lib/timezone";

export function BroadcastTime({ slot, align = "start", viewerTimeZone, now, reserveLocalSpace = false, showWeekday = false }: {
  slot: Pick<BroadcastSlot, "weekday" | "localTime" | "timezone">;
  align?: "start" | "end";
  viewerTimeZone?: string;
  now?: Date;
  reserveLocalSpace?: boolean;
  showWeekday?: boolean;
}) {
  const detectedTimeZone = useViewerTimeZone();
  const effectiveTimeZone = viewerTimeZone ?? detectedTimeZone;
  const local = effectiveTimeZone && effectiveTimeZone !== slot.timezone
    ? localBroadcastDisplay(slot, effectiveTimeZone, now)
    : null;

  return (
    <span className={align === "end" ? "block text-right" : "block"}>
      <strong className="block text-sm tabular-nums">
        {showWeekday && <span className="mr-2 text-xs font-normal text-muted">{weekdayLabel(slot.weekday)}</span>}
        {slot.localTime} <small className="font-medium text-muted">{timeZoneLabel(slot.timezone)}</small>
      </strong>
      {(local || reserveLocalSpace) && (
        <small
          className={`mt-0.5 block whitespace-nowrap text-[11px] font-normal tabular-nums text-muted${local ? "" : " invisible"}`}
          aria-hidden={local ? undefined : true}
        >
          {local ? `${local.weekday} ${local.time} ${local.timezone}` : "\u00a0"}
        </small>
      )}
    </span>
  );
}
