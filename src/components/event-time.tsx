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

export function EventTime({ event, viewerTimeZone, showTime = false }: {
  event: CalendarEvent;
  viewerTimeZone?: string;
  showTime?: boolean;
}) {
  const detectedTimeZone = useViewerTimeZone();
  const effectiveTimeZone = viewerTimeZone ?? detectedTimeZone;
  const isBirthday = event.eventType === "birthday";
  const startsAt = timedEvent(event.startsAt) ? event.startsAt : null;
  const showLocal = !isBirthday && startsAt
    && effectiveTimeZone && effectiveTimeZone !== event.timezone;
  const local = showLocal ? localDateTime(startsAt, effectiveTimeZone) : null;

  return (
    <time className="text-xs font-semibold tabular-nums" dateTime={event.startsAt ?? undefined}>
      <span className="block whitespace-nowrap">
        {showTime && startsAt && !isBirthday ? localDateTime(startsAt, event.timezone) : shortDate(event.startsAt, event.timezone)}
        {!isBirthday && startsAt && (
          <small className="ml-1 font-normal text-muted">{timeZoneLabel(event.timezone, new Date(startsAt))}</small>
        )}
      </span>
      {local && effectiveTimeZone && startsAt && (
        <small className="mt-0.5 block whitespace-nowrap text-[11px] font-normal text-muted">
          {local} {timeZoneLabel(effectiveTimeZone, new Date(startsAt))}
        </small>
      )}
    </time>
  );
}
