import { ArrowUpRight } from "lucide-react";
import type { AnimeDetail } from "@/domain";
import { weekdayLabel } from "@/lib/format";
import { BroadcastTime } from "@/components/broadcast-time";
import { Badge } from "@/components/badge";
import { EventTime } from "@/components/event-time";
import { eventPresentation, eventTitle } from "@/lib/event-presentation";
import { DataSources } from "./data-sources";

export function AnimeSidebar({ anime }: { anime: AnimeDetail }) {
  const verifiedEvents = anime.events.filter((event) => event.verified);

  return (
    <aside className="surface space-y-6 p-5 text-xs lg:sticky lg:top-24 lg:self-start">
      <section>
        <h2 className="text-sm font-semibold">放送</h2>
        <div className="mt-2 space-y-1">
          {anime.broadcasts.map((slot) => (
            <a
              className="block py-3 hover:text-accent"
              key={slot.id}
              href={slot.platformUrl ?? anime.officialUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              <span className="flex items-start justify-between gap-3">
                <strong>{weekdayLabel(slot.weekday)}</strong>
                <BroadcastTime slot={slot} align="end" />
              </span>
              <span className="mt-1 block text-xs text-muted">{slot.label}</span>
            </a>
          ))}
        </div>
      </section>

      {verifiedEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold">事件</h2>
          <div className="mt-2 space-y-1">
            {verifiedEvents.map((event) => {
              const presentation = eventPresentation(event.eventType);

              return (
                <a
                  className="grid grid-cols-[76px_1fr_auto] items-center gap-2 py-3 hover:text-accent"
                  key={event.id}
                  href={event.sourceUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <EventTime event={event} />
                  <span>
                    <Badge tone={presentation.tone}>{presentation.label}</Badge>
                    <span className="mt-1.5 block">{eventTitle(event)}</span>
                  </span>
                  <ArrowUpRight size={12} />
                </a>
              );
            })}
          </div>
        </section>
      )}

      {anime.accounts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold">公式账号</h2>
          <div className="mt-2 space-y-1">
            {anime.accounts.map((account) => (
              <a
                className="flex items-center justify-between py-3 hover:text-accent"
                key={account.id}
                href={account.url}
                target="_blank"
                rel="noreferrer"
              >
                <span>{account.handle ?? account.platform}</span>
                <ArrowUpRight size={12} />
              </a>
            ))}
          </div>
        </section>
      )}

      <DataSources anime={anime} />
    </aside>
  );
}
