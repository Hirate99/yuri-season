import { EmptyState, LoadingRows } from "@/components/empty-state";
import type { AdminAnimeSummary } from "@/domain";
import { useQuery } from "@tanstack/react-query";
import { AccountsEditor } from "./accounts-editor";
import { BroadcastsEditor } from "./broadcasts-editor";
import { CastEditor } from "./cast-editor";
import { DiscussionsEditor } from "./discussions-editor";
import { EventsEditor } from "./events-editor";
import { MediaEditor } from "./media-editor";
import { resourcesQuery } from "./queries";
import { SourcesEditor } from "./sources-editor";
import { StaffEditor } from "./staff-editor";
import { ThemeSongsEditor } from "./theme-songs-editor";

export type ResourceGroup = "people" | "content" | "monitoring";

export function AnimeResourcesEditor({ animeId, anime, group }: {
  animeId: string;
  anime: AdminAnimeSummary[];
  group: ResourceGroup;
}) {
  const resources = useQuery(resourcesQuery(animeId));

  return (
    <section className="border-t border-black/[0.05] bg-white p-5 md:p-7">
      {resources.isPending && <LoadingRows count={3} />}
      {resources.isRefetching && <p className="mb-3 text-xs text-muted" role="status">正在更新资料…</p>}
      {resources.error && <EmptyState title="资料加载失败" detail={resources.error.message} />}
      {resources.data && (
        <div className="grid gap-5 xl:grid-cols-2">
          {group === "people" && <>
            <BroadcastsEditor items={resources.data.broadcasts} animeId={animeId} />
            <StaffEditor items={resources.data.staff} animeId={animeId} />
            <CastEditor items={resources.data.cast} animeId={animeId} />
          </>}
          {group === "content" && <>
            <EventsEditor resources={resources.data} animeId={animeId} />
            <ThemeSongsEditor items={resources.data.themeSongs} animeId={animeId} />
            <DiscussionsEditor items={resources.data.discussions} anime={anime} animeId={animeId} />
            <MediaEditor resources={resources.data} animeId={animeId} />
          </>}
          {group === "monitoring" && <>
            <AccountsEditor animeId={animeId} resources={resources.data} />
            <SourcesEditor items={resources.data.sources} accounts={resources.data.accounts} animeId={animeId} />
          </>}
        </div>
      )}
    </section>
  );
}
