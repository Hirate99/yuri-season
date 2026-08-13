import { useState } from "react";
import type { AdminAnimeResources, AdminAnimeSummary, AdminResourceKind, AdminResourceWrite } from "@/domain";
import { EmptyState, LoadingRows } from "@/components/empty-state";
import { apiClient, rpcData, useApi } from "@/lib/api";
import { AccountsEditor } from "./accounts-editor";
import { BroadcastsEditor } from "./broadcasts-editor";
import { CastEditor } from "./cast-editor";
import { DiscussionsEditor } from "./discussions-editor";
import { EventsEditor } from "./events-editor";
import { MediaEditor } from "./media-editor";
import { SourcesEditor } from "./sources-editor";
import { StaffEditor } from "./staff-editor";
import { ThemeSongsEditor } from "./theme-songs-editor";

export type ResourceSave = (
  kind: AdminResourceKind,
  value: AdminResourceWrite["value"],
  id?: string,
) => Promise<void>;

export type ResourceGroup = "people" | "content" | "monitoring";

export function AnimeResourcesEditor({ animeId, anime, group, onChanged }: {
  animeId: string;
  anime: AdminAnimeSummary[];
  group: ResourceGroup;
  onChanged: () => void;
}) {
  const resources = useApi<AdminAnimeResources>((signal) => rpcData(
    apiClient.api.admin.anime[":id"].resources.$get({ param: { id: animeId } }, { init: { signal } }),
  ), [animeId]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save: ResourceSave = async (kind, value, id) => {
    const key = `${kind}:${id ?? "new"}`;
    setBusyKey(key);
    setError(null);
    try {
      if (id) {
        await rpcData(apiClient.api.admin.anime[":animeId"].resources[":kind"][":id"].$patch({
          param: { animeId, kind, id },
          json: value,
        }));
      } else {
        await rpcData(apiClient.api.admin.anime[":id"].resources.$post({
          param: { id: animeId },
          json: { kind, value } as AdminResourceWrite,
        }));
      }
      resources.reload();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      setBusyKey(null);
    }
  };

  const deleteDiscussionEverywhere = async (id: string, reason: string) => {
    const key = `discussion:${id}`;
    setBusyKey(key);
    setError(null);
    try {
      await rpcData(apiClient.api.admin.discussions[":id"].$delete({ param: { id }, json: { reason } }));
      resources.reload();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      setBusyKey(null);
    }
  };

  const remove = async (kind: Exclude<AdminResourceKind, "source">, id: string) => {
    const message = kind === "discussion"
      ? "确认从当前作品移除这个讨论串？若它还关联其他作品，讨论串本身会保留。"
      : "确认删除这条资料？";
    if (!window.confirm(message)) return;
    const key = `${kind}:${id}`;
    setBusyKey(key);
    setError(null);
    try {
      await rpcData(apiClient.api.admin.anime[":animeId"].resources[":kind"][":id"].$delete({
        param: { animeId, kind, id },
      }));
      resources.reload();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="border-t border-black/[0.05] bg-white p-5 md:p-7">
      {resources.loading && <LoadingRows count={3} />}
      {resources.error && <EmptyState title="资料加载失败" detail={resources.error} />}
      {error && <p className="mt-3 border border-line bg-raised p-2 text-[10px] text-[#8b3048]">{error}</p>}
      {resources.data && (
        <div className="grid gap-5 xl:grid-cols-2">
          {group === "people" && <>
            <BroadcastsEditor items={resources.data.broadcasts} busyKey={busyKey} onSave={save} onDelete={remove} />
            <StaffEditor items={resources.data.staff} busyKey={busyKey} onSave={save} onDelete={remove} />
            <CastEditor items={resources.data.cast} busyKey={busyKey} onSave={save} onDelete={remove} />
          </>}
          {group === "content" && <>
            <EventsEditor resources={resources.data} busyKey={busyKey} onSave={save} onDelete={remove} />
            <ThemeSongsEditor items={resources.data.themeSongs} busyKey={busyKey} onSave={save} onDelete={remove} />
            <DiscussionsEditor items={resources.data.discussions} anime={anime} currentAnimeId={animeId} busyKey={busyKey} onSave={save} onUnlink={remove} onDeleteEverywhere={deleteDiscussionEverywhere} />
            <MediaEditor resources={resources.data} busyKey={busyKey} onSave={save} onDelete={remove} />
          </>}
          {group === "monitoring" && <>
            <AccountsEditor animeId={animeId} resources={resources.data} busyKey={busyKey} onSave={save} onDelete={remove} />
            <SourcesEditor items={resources.data.sources} accounts={resources.data.accounts} busyKey={busyKey} onSave={save} />
          </>}
        </div>
      )}
    </section>
  );
}
