import { ArrowUpRight } from "lucide-react";
import type { CalendarEvent } from "@/domain";
import { Badge } from "@/components/badge";
import { CoverImage } from "@/components/cover-image";
import { EventTime } from "@/components/event-time";
import { eventIsOngoing } from "@/lib/calendar-events";
import { verifiedBirthdayPortrait } from "@/lib/character-portraits";
import { eventPresentation, eventTitle } from "@/lib/event-presentation";
import { cn } from "@/lib/ui";

export function CalendarEventCard({ event, now }: { event: CalendarEvent; now?: Date }) {
  const presentation = eventPresentation(event.eventType);
  const portrait = verifiedBirthdayPortrait(event);
  const isBirthday = event.eventType === "birthday";
  const isOngoing = eventIsOngoing(event, now);

  return (
    <article
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_32px] items-start gap-x-3 gap-y-2 rounded-xl border p-4",
        isBirthday
          ? "border-[#f2dce3] bg-[linear-gradient(110deg,#fff8fa_0%,#ffffff_52%)]"
          : "border-line bg-white",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 [&_time>span]:whitespace-normal [&_time>small]:whitespace-normal",
          isBirthday && "text-[#a84863]",
        )}
      >
        <EventTime event={event} showTime />
        <Badge tone={presentation.tone}>{presentation.label}</Badge>
        {isOngoing && <Badge tone="lime">进行中</Badge>}
      </div>

      <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 items-center gap-3">
        {portrait && (
          <a
            className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b64c69]"
            href={portrait.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${event.characterName ?? "角色"}头像来源`}
          >
            <CoverImage
              className="size-10 rounded-full ring-2 ring-white"
              src={portrait.imageUrl}
              alt={`${event.characterName ?? "角色"}头像`}
            />
          </a>
        )}
        <div className="min-w-0">
          <h3 className="text-sm leading-5 font-semibold">{eventTitle(event)}</h3>
          {(event.animeTitle || event.characterName) && (
            <p className="mt-1 text-xs leading-4 text-muted">
              {event.animeTitle ?? event.characterName}
            </p>
          )}
        </div>
      </div>

      {event.sourceUrl && (
        <a
          className="col-start-2 row-start-1 -mt-1 grid size-8 place-items-center rounded-full text-muted transition hover:bg-black/[0.045] hover:text-ink"
          href={event.sourceUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="查看来源"
        >
          <ArrowUpRight size={16} />
        </a>
      )}
    </article>
  );
}
