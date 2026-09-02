import type { AnimePageResponse } from "@/domain";
import { AnimeHeader } from "@/features/anime/anime-header";
import { AnimeSidebar } from "@/features/anime/anime-sidebar";
import { CastSection, StaffSection } from "@/features/anime/credits";
import { DiscussionsSection, MediaSection, UpdatesSection } from "@/features/anime/related-content";
import { ThemeSongsSection } from "@/features/anime/theme-songs";
import { apiClient, rpcData, useApi } from "@/lib/api";
import { page } from "@/lib/ui";

export function AnimePage({ data }: { data: AnimePageResponse }) {
  const related = useApi((signal) => rpcData(apiClient.api.anime[":slug"].related.$get(
    { param: { slug: data.anime.slug } },
    { init: { signal } },
  )), [data.anime.slug]);

  return (
    <div className={page}>
      <AnimeHeader anime={data.anime} />
      {related.data && <div className="mt-10"><DiscussionsSection discussions={related.data.discussions} /></div>}
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px] xl:gap-16">
        <div className="space-y-14">
          <ThemeSongsSection songs={data.anime.themeSongs} />
          <StaffSection staff={data.anime.staff} />
          <CastSection cast={data.anime.cast} />
          {related.data ? (
            <>
              <UpdatesSection items={related.data.feed} />
              <MediaSection media={related.data.media} />
            </>
          ) : (
            <p className="text-xs text-muted" role="status">
              {related.error ? "相关内容加载失败，请稍后重试。" : "正在加载相关内容…"}
            </p>
          )}
        </div>
        <AnimeSidebar anime={data.anime} />
      </div>
    </div>
  );
}
