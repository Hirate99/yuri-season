import { useEffect, useState } from "react";
import type { BroadcastSlot } from "@/domain";
import { useViewerTimeZone } from "@/hooks/use-viewer-timezone";
import { localBroadcastDisplay, timeZoneLabel, type LocalBroadcastDisplay } from "@/lib/timezone";

export function BroadcastTime({ slot, align = "start" }: {
  slot: Pick<BroadcastSlot, "weekday" | "localTime" | "timezone">;
  align?: "start" | "end";
}) {
  const viewerTimeZone = useViewerTimeZone();
  const [local, setLocal] = useState<LocalBroadcastDisplay | null>(null);

  useEffect(() => {
    setLocal(viewerTimeZone && viewerTimeZone !== slot.timezone
      ? localBroadcastDisplay(slot, viewerTimeZone)
      : null);
  }, [slot.localTime, slot.timezone, slot.weekday, viewerTimeZone]);

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
