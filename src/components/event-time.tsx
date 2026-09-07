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

export function EventTime({
  event,
  viewerTimeZone,
  showTime = false,
  wrap = false,
}: {
  event: CalendarEvent;
  viewerTimeZone?: string;
  showTime?: boolean;
  wrap?: boolean;
}) {
  const detectedTimeZone = useViewerTimeZone();
  const effectiveTimeZone = viewerTimeZone ?? detectedTimeZone;
  const isBirthday = event.eventType === "birthday";
  const startsAt = timedEvent(event.startsAt) ? event.startsAt : null;
  const endsAt = timedEvent(event.endsAt) ? event.endsAt : null;

  const sourceStart = event.startsAt
    ? showTime && startsAt
      ? localDateTime(startsAt, event.timezone)
      : shortDate(event.startsAt, event.timezone)
    : null;

  const sourceEnd = event.endsAt
    ? showTime && endsAt
      ? localDateTime(endsAt, event.timezone)
      : shortDate(event.endsAt, event.timezone)
    : null;

  const showLocal =
    !isBirthday && startsAt && effectiveTimeZone && effectiveTimeZone !== event.timezone;

  const local = showLocal ? localDateTime(startsAt, effectiveTimeZone) : null;
  const localEnd = showLocal && endsAt ? localDateTime(endsAt, effectiveTimeZone) : null;

  return (
    <time
      className={`text-xs font-semibold tabular-nums ${wrap ? "whitespace-normal wrap-anywhere" : "whitespace-nowrap"}`}
      dateTime={event.startsAt ?? undefined}
    >
      <span className="block">
        {sourceStart}
        {sourceEnd && sourceEnd !== sourceStart ? ` — ${sourceEnd}` : ""}
        {!isBirthday && startsAt && (
          <small className="ml-1 font-normal text-muted">
            {timeZoneLabel(event.timezone, new Date(startsAt))}
          </small>
        )}
      </span>
      {local && effectiveTimeZone && startsAt && (
        <small className="mt-0.5 block text-[11px] font-normal text-muted">
          {local}
          {localEnd && localEnd !== local ? ` — ${localEnd}` : ""}{" "}
          {timeZoneLabel(effectiveTimeZone, new Date(startsAt))}
        </small>
      )}
    </time>
  );
}
