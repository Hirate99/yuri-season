import { Await } from "@tanstack/react-router";
import type { MouseEvent } from "react";
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
  const anime = data.anime;
  return (
    <div className={page}>
      <AnimeHeader anime={anime} />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-12">
          <Await promise={related} fallback={<p id="updates" className="text-sm text-muted" role="status">正在加载相关动态…</p>}>
            {(content) => content ? <UpdatesSection items={content.feed} animeSlug={anime.slug} />
              : <p id="updates" className="text-sm text-muted" role="status">相关内容加载失败，请刷新重试。</p>}
          </Await>
          <CastSection cast={anime.cast} />
          <StaffSection staff={anime.staff} />
          <ThemeSongsSection songs={anime.themeSongs} />
          <Await promise={related} fallback={null}>{(content) => content && <DiscussionsSection discussions={content.discussions} />}</Await>
          <Await promise={related} fallback={null}>{(content) => content && <MediaSection media={content.media} />}</Await>
        </div>
        <AnimeSidebar anime={anime} />
      </div>
    </div>
  );
}
