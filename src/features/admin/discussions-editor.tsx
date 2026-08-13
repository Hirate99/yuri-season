import { useState, type FormEvent } from "react";
import { Search, Trash2 } from "lucide-react";
import type { AdminAnimeSummary, AdminDiscussion, DiscussionWrite } from "@/domain";
import type { ResourceSave } from "./anime-resources-editor";
import { AdminField, adminInput, formText, ResourceActions, ResourceDetails } from "./resource-form";

function write(form: FormData): DiscussionWrite {
  return {
    platform: formText(form, "platform") ?? "",
    title: formText(form, "title") ?? "",
    url: formText(form, "url") ?? "",
    note: formText(form, "note"),
    isActive: form.get("isActive") === "on",
    lastActivityAt: formText(form, "lastActivityAt"),
    animeIds: form.getAll("animeIds").map(String),
  };
}

function WorkLinks({ anime, currentAnimeId, selectedIds }: {
  anime: AdminAnimeSummary[]; currentAnimeId: string; selectedIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set([currentAnimeId, ...selectedIds]));
  const needle = query.trim().toLocaleLowerCase();
  const currentSeasonId = anime.find((work) => work.id === currentAnimeId)?.seasonId;
  const select = (ids: string[]) => setSelected(new Set([currentAnimeId, ...ids]));
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    next.add(currentAnimeId);
    return next;
  });
  return (
    <fieldset className="grid gap-2 md:col-span-2">
      <div className="flex items-end justify-between gap-3">
        <legend className="text-[10px] font-semibold text-muted">关联作品</legend>
        <span className="text-[9px] text-muted">已选 {selected.size} 部</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button className="rounded-full bg-[#eeeafd] px-2.5 py-1.5 text-[9px] font-semibold text-[#51459d]" type="button" onClick={() => select(anime.filter((work) => work.seasonId === currentSeasonId).map((work) => work.id))}>全选当前季度</button>
        <button className="rounded-full bg-white px-2.5 py-1.5 text-[9px] font-semibold text-muted" type="button" onClick={() => select(anime.map((work) => work.id))}>全选全部作品</button>
        <button className="rounded-full bg-white px-2.5 py-1.5 text-[9px] font-semibold text-muted" type="button" onClick={() => select([])}>仅保留当前作品</button>
        <span className="self-center text-[9px] text-muted">综合串可先全选，再取消少数例外</span>
      </div>
      <label className="flex h-10 items-center gap-2 rounded-xl bg-[#f4f5f7] px-3">
        <Search size={13} className="text-muted" />
        <input className="min-w-0 flex-1 bg-transparent text-xs outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索要关联的作品" />
      </label>
      <div className="grid max-h-52 gap-1 overflow-y-auto rounded-xl border border-black/[0.06] p-1.5 sm:grid-cols-2">
        {anime.map((work) => {
          const haystack = `${work.titleZh} ${work.titleJa} ${work.slug}`.toLocaleLowerCase();
          const hidden = Boolean(needle && !haystack.includes(needle));
          return (
            <label className={`${hidden ? "hidden" : "flex"} cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-[10px] hover:bg-[#f4f5f7]`} key={work.id}>
              <input type="checkbox" checked={selected.has(work.id)} disabled={work.id === currentAnimeId} onChange={() => toggle(work.id)} />
              <span className="min-w-0"><strong className="block truncate font-semibold">{work.titleZh}</strong><small className="mt-0.5 block truncate text-[9px] text-muted">{work.seasonLabel}{work.id === currentAnimeId ? " · 当前作品" : ""}</small></span>
            </label>
          );
        })}
      </div>
      {[...selected].map((id) => <input key={id} name="animeIds" value={id} type="hidden" />)}
    </fieldset>
  );
}

function DiscussionForm({ item, anime, currentAnimeId, busy, onSave, onUnlink, onDeleteEverywhere }: {
  item?: AdminDiscussion; anime: AdminAnimeSummary[]; currentAnimeId: string;
  busy: boolean; onSave: ResourceSave; onUnlink?: () => void;
  onDeleteEverywhere?: (reason: string) => Promise<void>;
}) {
  const [deleteReason, setDeleteReason] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("discussion", write(new FormData(event.currentTarget)), item?.id); } catch { /* parent shows error */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="平台"><input className={adminInput} name="platform" defaultValue={item?.platform ?? ""} placeholder="作品贴吧 / 萌战吧 / NGA / 百合会" required /></AdminField>
      <AdminField label="最近活跃"><input className={adminInput} name="lastActivityAt" defaultValue={item?.lastActivityAt ?? ""} placeholder="带时区的 ISO 时间" /></AdminField>
      <AdminField label="标题" wide><input className={adminInput} name="title" defaultValue={item?.title ?? ""} required /></AdminField>
      <AdminField label="原始链接" wide><input className={adminInput} name="url" type="url" defaultValue={item?.url ?? ""} required /></AdminField>
      <AdminField label="备注" wide><textarea className={adminInput} name="note" defaultValue={item?.note ?? ""} rows={2} /></AdminField>
      <WorkLinks anime={anime} currentAnimeId={currentAnimeId} selectedIds={item?.animeIds ?? []} />
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2"><input name="isActive" type="checkbox" defaultChecked={item?.isActive ?? true} />启用</label>
      {item && onDeleteEverywhere && (
        <div className="grid gap-2 rounded-xl border border-[#8b3048]/15 bg-[#fff7f9] p-3 md:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className={adminInput}
            maxLength={300}
            placeholder={`彻底删除原因（将从 ${item.sharedAnimeCount} 部作品及 Feed 撤下）`}
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
          />
          <button
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-[#8b3048] px-4 text-xs font-bold text-white disabled:opacity-40"
            disabled={busy || !deleteReason.trim()}
            onClick={() => {
              if (!window.confirm(`确认彻底删除这条讨论？它将从 ${item.sharedAnimeCount} 部作品及 Feed 撤下。`)) return;
              void onDeleteEverywhere(deleteReason.trim())
                .then(() => setDeleteReason(""))
                .catch(() => { /* parent shows the API error */ });
            }}
            type="button"
          ><Trash2 size={13} />彻底删除</button>
        </div>
      )}
      <ResourceActions busy={busy} deleteLabel="从本作移除" onDelete={item && item.sharedAnimeCount > 1 ? onUnlink : undefined} />
    </form>
  );
}

export function DiscussionsEditor({ items, anime, currentAnimeId, busyKey, onSave, onUnlink, onDeleteEverywhere }: {
  items: AdminDiscussion[]; anime: AdminAnimeSummary[]; currentAnimeId: string;
  busyKey: string | null; onSave: ResourceSave;
  onUnlink: (kind: "discussion", id: string) => Promise<void>;
  onDeleteEverywhere: (id: string, reason: string) => Promise<void>;
}) {
  return (
    <section className="border border-line bg-raised px-4 xl:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2 pt-4"><div><h4 className="text-sm font-bold">集中讨论</h4><p className="mt-1 text-[10px] text-muted">综合串只保存一份，可同时出现在多部作品页。</p></div></div>
      {items.map((item) => <ResourceDetails key={item.id} title={item.title} meta={`${item.isActive ? item.platform : "停用"}${item.sharedAnimeCount > 1 ? ` · 跨 ${item.sharedAnimeCount} 部作品` : ""}`}><DiscussionForm item={item} anime={anime} currentAnimeId={currentAnimeId} busy={busyKey === `discussion:${item.id}`} onSave={onSave} onUnlink={() => void onUnlink("discussion", item.id)} onDeleteEverywhere={(reason) => onDeleteEverywhere(item.id, reason)} /></ResourceDetails>)}
      <ResourceDetails title="新增讨论串" meta="＋"><DiscussionForm anime={anime} currentAnimeId={currentAnimeId} busy={busyKey === "discussion:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
