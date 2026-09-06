import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import type { CatalogResponse, FeedResponse } from "@/domain";
import { AnimeCard } from "@/components/anime-card";
import { FeedCard } from "@/components/feed-card";
import { HomeCalendar } from "@/components/home-calendar";
import { SectionHeading } from "@/components/section-heading";
import { SeasonHero } from "@/components/season-hero";
import { orderByBroadcastFromToday } from "@/lib/home-ordering";
import { page, textButton } from "@/lib/ui";

export function HomePage({
  catalog,
  feed,
  seasonSlug,
  viewerTimeZone,
  renderedAt,
}: {
  catalog: CatalogResponse;
  feed: FeedResponse | null;
  seasonSlug?: string;
  viewerTimeZone?: string;
  renderedAt?: string;
}) {
  useEffect(() => {
    if (seasonSlug || window.location.hash !== "#works") return;

    const [navigation] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (navigation?.type !== "reload") return;

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [seasonSlug]);

  const renderedNow = renderedAt ? new Date(renderedAt) : undefined;
  const timeZone = viewerTimeZone ?? "Asia/Tokyo";
  const now = renderedNow ?? new Date(catalog.generatedAt);

  const worksAnime = seasonSlug
    ? catalog.anime
    : orderByBroadcastFromToday(catalog.anime, timeZone, now);

  return (
    <div className={page}>
      <SeasonHero
        season={catalog.season}
        count={catalog.anime.length}
        archived={Boolean(seasonSlug)}
        anime={worksAnime}
        viewerTimeZone={timeZone}
        now={now}
      />

      {!seasonSlug && (
        <HomeCalendar
          catalog={catalog}
          viewerTimeZone={viewerTimeZone ?? "Asia/Tokyo"}
          renderedAt={renderedAt ?? catalog.generatedAt}
        />
      )}

      <section id="works" className="mt-8 md:mt-12">
        <SectionHeading
          title="作品"
          action={!seasonSlug && <span className="text-xs text-muted">从今天起 · 按放送时间</span>}
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 lg:grid-cols-5 xl:grid-cols-6">
          {worksAnime.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              viewerTimeZone={viewerTimeZone}
              now={renderedNow}
            />
          ))}
        </div>
      </section>

      {!seasonSlug && (
        <section className="mt-12 md:mt-14">
          <SectionHeading
            title="最近更新"
            action={
              <Link to="/feed" className={textButton}>
                全部 <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {feed?.items.map((item) => (
              <FeedCard key={item.id} item={item} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
