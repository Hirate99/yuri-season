import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CatalogResponse } from "@/domain";
import { useViewerTimeZone } from "@/hooks/use-viewer-timezone";
import { eventOccursToday } from "@/lib/calendar-events";
import { verifiedBirthdayPortrait } from "@/lib/character-portraits";
import { eventPresentation, eventTitle } from "@/lib/event-presentation";
import { broadcastInstantOnViewerDate } from "@/lib/timezone";
import { BroadcastTime } from "./broadcast-time";
import { Badge } from "./badge";
import { CoverImage } from "./cover-image";
import { EventTime } from "./event-time";

function todayLabel(timeZone: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export function TodayPanel({ catalog }: { catalog: CatalogResponse }) {
  const detectedTimeZone = useViewerTimeZone();
  const viewerTimeZone = detectedTimeZone ?? "Asia/Tokyo";
  const broadcasts = catalog.anime.filter((anime) => anime.primarySlot
    && broadcastInstantOnViewerDate(anime.primarySlot, viewerTimeZone));
  const events = catalog.events.filter((event) => eventOccursToday(event, viewerTimeZone));

  if (broadcasts.length === 0 && events.length === 0) return null;

  return (
    <section className="relative z-10 mt-3 overflow-hidden rounded-[10px] bg-charcoal px-4 py-5 text-white shadow-[0_24px_55px_rgba(15,23,42,0.18)] md:-mt-3 md:mx-8 md:px-6 md:py-6" aria-labelledby="today-title">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 id="today-title" className="flex items-center gap-2 text-lg font-bold tracking-tight md:text-xl"><span className="size-2 rounded-full bg-signal-coral shadow-[0_0_0_4px_rgba(255,90,47,0.12)]" />今天</h2>
          <p className="text-[10px] text-white/55">{todayLabel(viewerTimeZone)}</p>
        </div>
        <Link to="/calendar" className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/70 hover:text-white">日历 <ArrowRight size={13} /></Link>
      </header>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {broadcasts.map((anime) => (
          <Link key={anime.id} to="/anime/$slug" params={{ slug: anime.slug }} className="grid grid-cols-[46px_1fr] gap-3 rounded-[7px] border border-white/10 bg-white/8 p-3 backdrop-blur-xl transition hover:bg-white/13">
            <CoverImage className="aspect-[3/4] w-[46px] rounded-md" src={anime.coverUrl} alt={`${anime.titleZh} 封面`} />
            <span className="min-w-0">
              <Badge tone="blue">放送</Badge>
              <strong className="mt-1.5 block truncate text-xs">{anime.titleZh}</strong>
              {anime.primarySlot && <span className="mt-1.5 block text-white [&_.text-muted]:!text-white/55"><BroadcastTime slot={anime.primarySlot} /></span>}
            </span>
          </Link>
        ))}
        {events.map((event) => {
          const presentation = eventPresentation(event.eventType);
          const portrait = verifiedBirthdayPortrait(event);
          return (
            <a key={event.id} href={event.sourceUrl ?? "#"} target="_blank" rel="noreferrer" className="grid min-h-22 grid-cols-[1fr_auto] gap-3 rounded-[7px] border border-white/10 bg-white/8 p-3 backdrop-blur-xl transition hover:bg-white/13">
              <span className="flex min-w-0 flex-col justify-between"><Badge tone={presentation.tone}>{presentation.label}</Badge>
                <span>
                <strong className="mt-2 block text-xs">{eventTitle(event)}</strong>
                <span className="mt-1.5 block text-white [&_.text-muted]:!text-white/55"><EventTime event={event} /></span>
                </span>
              </span>
              {portrait && <CoverImage className="size-14 self-center rounded-full ring-1 ring-white/15" src={portrait.imageUrl} alt={`${event.characterName ?? "角色"}头像`} />}
            </a>
          );
        })}
      </div>
    </section>
  );
}
