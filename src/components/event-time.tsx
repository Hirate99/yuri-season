import type { CalendarEvent } from "@/domain";
import { useViewerTimeZone } from "@/hooks/use-viewer-timezone";
import { shortDate } from "@/lib/format";
import { timeZoneLabel } from "@/lib/timezone";

function timedEvent(value: string | null): value is string {
  return Boolean(value && !/^\d{4}-\d{2}-\d{2}$/.test(value));
}

function localDateTime(value: string, timeZone: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone,
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  } catch {
    return null;
  }
}

export function EventTime({ event }: { event: CalendarEvent }) {
  const viewerTimeZone = useViewerTimeZone();
  const isBirthday = event.eventType === "birthday";
  const startsAt = timedEvent(event.startsAt) ? event.startsAt : null;
  const showLocal = !isBirthday && startsAt
    && viewerTimeZone && viewerTimeZone !== event.timezone;
  const local = showLocal ? localDateTime(startsAt, viewerTimeZone) : null;

  return (
    <time className="text-xs font-semibold tabular-nums" dateTime={event.startsAt ?? undefined}>
      <span className="block whitespace-nowrap">
        {shortDate(event.startsAt, event.timezone)}
        {!isBirthday && startsAt && (
          <small className="ml-1 font-normal text-muted">{timeZoneLabel(event.timezone, new Date(startsAt))}</small>
        )}
      </span>
      {local && viewerTimeZone && startsAt && (
        <small className="mt-0.5 block whitespace-nowrap text-[9px] font-normal text-muted">
          {local} {timeZoneLabel(viewerTimeZone, new Date(startsAt))}
        </small>
      )}
    </time>
  );
}
