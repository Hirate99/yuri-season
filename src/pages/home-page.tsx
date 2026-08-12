import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CatalogResponse, FeedResponse } from "@/domain";
import { AnimeCard } from "@/components/anime-card";
import { FeedCard } from "@/components/feed-card";
import { SectionHeading } from "@/components/section-heading";
import { SeasonHero } from "@/components/season-hero";
import { TodayPanel } from "@/components/today-panel";
import { page, textButton } from "@/lib/ui";

export function HomePage({ catalog, feed, seasonSlug, viewerTimeZone, renderedAt }: {
  catalog: CatalogResponse;
  feed: FeedResponse | null;
  seasonSlug?: string;
  viewerTimeZone?: string;
  renderedAt?: string;
}) {
  const renderedNow = renderedAt ? new Date(renderedAt) : undefined;
  return (
    <div className={page}>
      <SeasonHero
        season={catalog.season}
        anime={catalog.anime}
        archived={Boolean(seasonSlug)}
      />

      {!seasonSlug && (
        <TodayPanel
          catalog={catalog}
          viewerTimeZone={viewerTimeZone ?? "Asia/Tokyo"}
          renderedAt={renderedAt ?? catalog.generatedAt}
        />
      )}

      <section className="mt-12 md:mt-16">
        <SectionHeading title="作品" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {catalog.anime.map((anime) => (
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
          <SectionHeading title="最近更新" action={<Link to="/feed" className={textButton}>全部 <ArrowRight size={14} /></Link>} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{feed?.items.map((item) => <FeedCard key={item.id} item={item} compact />)}</div>
        </section>
      )}
    </div>
  );
}
