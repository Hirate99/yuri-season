import { ArrowUpRight } from "lucide-react";
import type { CalendarEvent } from "@/domain";
import { Badge } from "@/components/badge";
import { CoverImage } from "@/components/cover-image";
import { EventTime } from "@/components/event-time";
import { verifiedBirthdayPortrait } from "@/lib/character-portraits";
import { eventPresentation, eventTitle } from "@/lib/event-presentation";
import { cn } from "@/lib/ui";

export function CalendarEventCard({ event }: { event: CalendarEvent }) {
  const presentation = eventPresentation(event.eventType);
  const portrait = verifiedBirthdayPortrait(event);
  const isBirthday = event.eventType === "birthday";

  return (
    <article className={cn(
      "grid min-h-20 grid-cols-[minmax(0,1fr)_32px] items-center gap-x-3 rounded-2xl border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)] transition-shadow hover:shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:grid-cols-[148px_minmax(0,1fr)_32px] md:gap-x-5",
      isBirthday
        ? "border-[#f2dce3] bg-[linear-gradient(110deg,#fff8fa_0%,#ffffff_52%)]"
        : "border-black/[0.06] bg-white",
    )}>
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 md:self-center">
        {portrait && (
          <a
            className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b64c69]"
            href={portrait.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${event.characterName ?? "角色"}头像来源`}
          >
            <span className="absolute -inset-1 rounded-full bg-[#fae7ed]" aria-hidden="true" />
            <CoverImage
              className="relative size-12 rounded-full ring-2 ring-white"
              src={portrait.imageUrl}
              alt={`${event.characterName ?? "角色"}头像`}
            />
          </a>
        )}
        <div className={cn("min-w-0", isBirthday && "text-[#a84863]")}>
          <EventTime event={event} />
        </div>
      </div>

      <div className="col-span-2 col-start-1 row-start-2 mt-3 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1 md:mt-0">
        <Badge tone={presentation.tone}>{presentation.label}</Badge>
        <h3 className="mt-2 text-[15px] leading-5 font-bold tracking-[-0.01em]">
          {eventTitle(event)}
        </h3>
        {(event.animeTitle || event.characterName) && (
          <p className="mt-1 text-[10px] text-muted">{event.animeTitle ?? event.characterName}</p>
        )}
      </div>

      {event.sourceUrl && (
        <a
          className="col-start-2 row-start-1 grid size-8 place-items-center rounded-full text-muted transition hover:bg-black/[0.045] hover:text-ink md:col-start-3"
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
