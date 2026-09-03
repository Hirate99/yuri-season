import { Await } from "@tanstack/react-router";
import type { AnimePageResponse, AnimeRelatedResponse } from "@/domain";
import { AnimeHeader } from "@/features/anime/anime-header";
import { AnimeSidebar } from "@/features/anime/anime-sidebar";
import { CastSection, StaffSection } from "@/features/anime/credits";
import { DiscussionsSection, MediaSection, UpdatesSection } from "@/features/anime/related-content";
import { ThemeSongsSection } from "@/features/anime/theme-songs";
import { page } from "@/lib/ui";

export function AnimePage({ data, related }: {
  data: AnimePageResponse;
  related: Promise<AnimeRelatedResponse | null>;
}) {
  return (
    <div className={page}>
      <AnimeHeader anime={data.anime} />
      <Await promise={related} fallback={<></>}>{(content) => content && (
        <div className="mt-10"><DiscussionsSection discussions={content.discussions} /></div>
      )}</Await>
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px] xl:gap-16">
        <div className="space-y-14">
          <ThemeSongsSection songs={data.anime.themeSongs} />
          <StaffSection staff={data.anime.staff} />
          <CastSection cast={data.anime.cast} />
          <Await
            promise={related}
            fallback={<p className="text-xs text-muted" role="status">正在加载相关内容…</p>}
          >
            {(content) => content ? (
              <>
                <UpdatesSection items={content.feed} />
                <MediaSection media={content.media} />
              </>
            ) : <p className="text-xs text-muted" role="status">相关内容加载失败，请稍后重试。</p>}
          </Await>
        </div>
        <AnimeSidebar anime={data.anime} />
      </div>
    </div>
  );
}
