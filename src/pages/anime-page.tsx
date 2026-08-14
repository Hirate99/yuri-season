import type { AnimePageResponse } from "@/domain";
import { AnimeHeader } from "@/features/anime/anime-header";
import { AnimeSidebar } from "@/features/anime/anime-sidebar";
import { CastSection, StaffSection } from "@/features/anime/credits";
import { DiscussionsSection, MediaSection, UpdatesSection } from "@/features/anime/related-content";
import { ThemeSongsSection } from "@/features/anime/theme-songs";
import { page } from "@/lib/ui";

export function AnimePage({ data }: { data: AnimePageResponse & { viewerTimeZone: string } }) {
  return (
    <div className={page}>
      <AnimeHeader anime={data.anime} />
      <div className="mt-10"><DiscussionsSection discussions={data.discussions} /></div>
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px] xl:gap-16">
        <div className="space-y-14">
          <ThemeSongsSection songs={data.anime.themeSongs} />
          <StaffSection staff={data.anime.staff} />
          <CastSection cast={data.anime.cast} />
          <UpdatesSection items={data.feed} />
          <MediaSection media={data.media} />
        </div>
        <AnimeSidebar anime={data.anime} viewerTimeZone={data.viewerTimeZone} />
      </div>
    </div>
  );
}
