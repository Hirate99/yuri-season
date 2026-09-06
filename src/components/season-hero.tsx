import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { CatalogAnime, Season } from "@/domain";
import { shortDate, weekdayLabel } from "@/lib/format";
import { broadcastInstantOnViewerDate, localBroadcastDisplay, timeZoneLabel } from "@/lib/timezone";
import { seasonVisualName, seasonVisuals } from "@/lib/season-presentation";
import { CoverImage } from "./cover-image";
import { SeasonGlyphArt } from "./season-glyph-art";

const rememberedCardIndexBySeason = new Map<string, number>();

function seasonYear(season: Season): string {
  return season.label.match(/\d{4}/)?.[0] ?? season.startsOn.slice(0, 4);
}

function uniqueAnime(anime: CatalogAnime[]): CatalogAnime[] {
  return anime.filter(
    (item, index) => anime.findIndex((candidate) => candidate.id === item.id) === index,
  );
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  let state =
    Array.from(seed).reduce(
      (value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619),
      2166136261,
    ) >>> 0;

  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    const target = state % (index + 1);

    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

function randomSeasonCards(anime: CatalogAnime[], seed: string): CatalogAnime[] {
  const unique = uniqueAnime(anime);

  const withCovers = seededShuffle(
    unique.filter((item) => item.coverUrl),
    `${seed}:covers`,
  );

  const withoutCovers = seededShuffle(
    unique.filter((item) => !item.coverUrl),
    `${seed}:fallbacks`,
  );

  return [...withCovers, ...withoutCovers].slice(0, 3);
}

function cardPosition(
  index: number,
  activeIndex: number,
  count: number,
): "active" | "next" | "previous" {
  const offset = (index - activeIndex + count) % count;
  if (offset === 0) return "active";
  if (offset === 1) return "next";

  return "previous";
}

export function SeasonHero({
  season,
  count,
  archived = false,
  anime,
  viewerTimeZone,
  now,
}: {
  season: Season;
  count: number;
  archived?: boolean;
  anime: CatalogAnime[];
  viewerTimeZone?: string;
  now?: Date;
}) {
  const visualName = seasonVisualName(season);
  const seasonPresentation = seasonVisuals[visualName];
  const selectionSeed = `${season.slug}:${now?.toISOString() ?? "stable"}`;
  const cards = useMemo(() => randomSeasonCards(anime, selectionSeed), [anime, selectionSeed]);

  const [activeIndex, setActiveIndex] = useState(
    () => rememberedCardIndexBySeason.get(season.slug) ?? 0,
  );

  const [paused, setPaused] = useState(false);
  const visibleIndex = cards.length ? activeIndex % cards.length : 0;
  const active = cards[visibleIndex];
  const effectiveTimeZone = viewerTimeZone ?? "Asia/Tokyo";
  const referenceNow = now ?? new Date();
  const slot = active?.primarySlot;

  const local =
    slot && effectiveTimeZone !== slot.timezone
      ? localBroadcastDisplay(slot, effectiveTimeZone, referenceNow)
      : null;

  const broadcastLabel = archived
    ? "季度归档"
    : slot
      ? broadcastInstantOnViewerDate(slot, effectiveTimeZone, referenceNow)
        ? "今日放送"
        : "即将放送"
      : "本季作品";

  useEffect(() => {
    if (paused || cards.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    let timeout: number | undefined;

    const clearScheduledAdvance = () => {
      if (timeout !== undefined) window.clearTimeout(timeout);

      timeout = undefined;
    };

    const advance = () => {
      setActiveIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % cards.length;

        rememberedCardIndexBySeason.set(season.slug, nextIndex);

        return nextIndex;
      });
    };

    const scheduleAdvance = () => {
      clearScheduledAdvance();
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;

      timeout = window.setTimeout(() => {
        if (document.visibilityState !== "visible" || !document.hasFocus()) return;

        advance();
        scheduleAdvance();
      }, 5_500);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleAdvance();
      else clearScheduledAdvance();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", clearScheduledAdvance);
    window.addEventListener("focus", scheduleAdvance);
    scheduleAdvance();

    return () => {
      clearScheduledAdvance();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", clearScheduledAdvance);
      window.removeEventListener("focus", scheduleAdvance);
    };
  }, [cards, paused, season.slug]);

  return (
    <header
      className={`relative isolate overflow-hidden pb-6 pt-2 ${active ? "min-h-190 sm:min-h-180 md:min-h-140 lg:min-h-[610px]" : "min-h-110 md:min-h-[520px]"}`}
      aria-label={`${season.label} 百合动画`}
    >
      <div className="absolute left-0 top-3 z-20 md:top-8">
        <div className="flex flex-col items-start gap-1">
          <p
            data-season-year
            className="text-sm leading-none font-medium tracking-[0.04em] text-ink tabular-nums md:text-base"
          >
            {seasonYear(season)}
          </p>
          <p
            data-season-english
            className="text-[30px] leading-[0.92] font-bold tracking-[0.045em] text-accent md:text-[38px]"
          >
            {seasonPresentation.english}
          </p>
        </div>
        <p
          data-season-date
          className="mt-2 whitespace-nowrap text-xs tracking-[0.035em] text-muted tabular-nums"
        >
          {shortDate(season.startsOn)} — {shortDate(season.endsOn)}
        </p>
      </div>

      <div className="pointer-events-none absolute -left-[5%] top-[92px] z-0 grid h-[350px] w-[84%] place-items-center sm:left-[2%] sm:top-[100px] sm:h-[440px] sm:w-[70%] md:left-[7%] md:top-[62px] md:h-[500px] md:w-[49%]">
        <h1 className="sr-only">{seasonPresentation.glyph}</h1>
        <SeasonGlyphArt season={visualName} className="h-full w-full" />
        <span data-season-glyph={seasonPresentation.glyph} className="sr-only">
          {seasonPresentation.glyph}
        </span>
        <span
          className="absolute right-[3%] top-[28%] hidden text-[10px] font-semibold tracking-[0.14em] text-accent md:right-[1%] md:top-[31%] md:block"
          style={{ writingMode: "vertical-rl" }}
        >
          YURI ANIME INDEX
        </span>
      </div>

      <a
        href="#works"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("works")?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
            block: "start",
          });
        }}
        className="group absolute bottom-7 left-0 z-20 inline-flex items-baseline gap-2 py-2 text-ink md:bottom-10"
      >
        <strong className="text-2xl leading-none font-medium tracking-[-0.045em] tabular-nums">
          {count}
        </strong>
        <span className="text-xs text-muted">部百合动画</span>
        <span className="text-xs font-medium text-accent">
          {archived ? "查看归档" : "浏览本季"}
        </span>
        <ArrowUpRight
          size={13}
          aria-hidden="true"
          className="text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
        />
      </a>

      {active && (
        <figure
          className="absolute right-0 top-[160px] z-10 w-[66%] max-w-[430px] sm:top-[150px] sm:w-[52%] md:right-[1%] md:top-[54px] md:w-[42%] md:max-w-[500px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="season-card-stage relative mx-auto aspect-[3/4] w-[86%] max-w-[268px] md:w-[64%]">
            {cards.map((item, index) => {
              const position = cardPosition(index, visibleIndex, cards.length);

              return (
                <Link
                  key={item.id}
                  to="/anime/$slug"
                  params={{ slug: item.slug }}
                  data-card-position={position}
                  aria-hidden={position === "active" ? undefined : true}
                  tabIndex={position === "active" ? undefined : -1}
                  className="season-card absolute inset-0 block rounded-[5px]"
                >
                  <CoverImage
                    className="h-full w-full rounded-[5px] ring-1 ring-black/5"
                    src={item.coverUrl}
                    alt={position === "active" ? `${item.titleZh} 封面` : ""}
                    eager
                  />
                </Link>
              );
            })}

            {cards.length > 1 && (
              <div
                className="absolute -top-11 right-0 z-20 flex items-center"
                aria-label="切换主推作品"
              >
                {cards.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`显示 ${item.titleZh}`}
                    aria-pressed={index === visibleIndex}
                    onClick={() => {
                      rememberedCardIndexBySeason.set(season.slug, index);
                      setActiveIndex(index);
                    }}
                    onMouseEnter={() => {
                      rememberedCardIndexBySeason.set(season.slug, index);
                      setActiveIndex(index);
                    }}
                    className={`relative grid size-10 place-items-center text-[10px] tabular-nums transition-colors ${index === visibleIndex ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                    <span
                      className={`absolute bottom-1 size-1 rounded-full bg-accent ${index === visibleIndex ? "opacity-100" : "opacity-0"}`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <figcaption className="relative mt-7 min-h-32">
            {slot && (
              <div
                className="pointer-events-none absolute -top-7 right-0 z-0 whitespace-nowrap text-[clamp(4.25rem,11vw,7.5rem)] leading-none font-semibold tracking-[-0.075em] text-accent-soft tabular-nums"
                aria-hidden="true"
              >
                {slot.localTime}
              </div>
            )}
            <div className="relative z-10 flex items-end justify-between gap-4 pt-10 md:pt-14">
              <div className="min-w-0">
                <Link
                  to="/anime/$slug"
                  params={{ slug: active.slug }}
                  className="text-sm leading-6 font-semibold text-ink transition-colors hover:text-accent md:text-base"
                >
                  {active.titleZh}
                  <ArrowUpRight
                    size={13}
                    aria-hidden="true"
                    className="ml-1 inline-block align-baseline text-accent"
                  />
                </Link>
                {slot && (
                  <p className="mt-1 text-[11px] leading-5 text-muted tabular-nums">
                    {weekdayLabel(slot.weekday)} · {timeZoneLabel(slot.timezone)}
                    {local && (
                      <span className="block">
                        {local.weekday} {local.time} {local.timezone}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <span className="shrink-0 pb-1 text-[11px] font-medium text-accent">
                {broadcastLabel}
              </span>
            </div>
          </figcaption>
        </figure>
      )}
    </header>
  );
}
