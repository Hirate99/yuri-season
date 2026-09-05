import type { AdminAnimeSummary, AdminDiscussion, DiscussionWrite } from "@/domain";
import { discussionSchema } from "@/domain/inputs/discussion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { deleteDiscussionMutation, saveResourceMutation } from "./queries";
import { AdminField, adminInput, FormErrors, optionalText, ResourceActions, ResourceDetails } from "./resource-form";

function WorkLinks({ anime, currentAnimeId, selected, onChange }: {
  anime: AdminAnimeSummary[]; currentAnimeId: string; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const currentSeasonId = anime.find((work) => work.id === currentAnimeId)?.seasonId;
  const select = (ids: string[]) => onChange([...new Set([currentAnimeId, ...ids])]);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    next.add(currentAnimeId);
    onChange([...next]);
  };
  return (
    <fieldset className="grid gap-2 md:col-span-2">
      <div className="flex items-end justify-between gap-3">
        <legend className="text-[10px] font-semibold text-muted">关联作品</legend>
        <span className="text-[9px] text-muted">已选 {selected.length} 部</span>
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
              <input type="checkbox" checked={selected.includes(work.id)} disabled={work.id === currentAnimeId} onChange={() => toggle(work.id)} />
              <span className="min-w-0"><strong className="block truncate font-semibold">{work.titleZh}</strong><small className="mt-0.5 block truncate text-[9px] text-muted">{work.seasonLabel}{work.id === currentAnimeId ? " · 当前作品" : ""}</small></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DiscussionForm({ item, anime, animeId }: {
  animeId: string;
  item?: AdminDiscussion; anime: AdminAnimeSummary[];
}) {
  const remove = useMutation(deleteDiscussionMutation);
  const [deleteReason, setDeleteReason] = useState("");
  const save = useMutation(saveResourceMutation(animeId, item?.id));
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<z.input<typeof discussionSchema>, unknown, DiscussionWrite>({
    resolver: zodResolver(discussionSchema), defaultValues: { ...item, isActive: item?.isActive ?? true, animeIds: [...new Set([animeId, ...(item?.animeIds ?? [])])] },
  });
  const selected = useWatch({ control, name: "animeIds" }) ?? [];
  const submit = handleSubmit(value => { save.mutate({ kind: "discussion", value }); });
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="平台"><input className={adminInput} {...register("platform")} placeholder="作品贴吧 / 萌战吧 / NGA / 百合会" required /></AdminField>
      <AdminField label="最近活跃"><input className={adminInput} {...register("lastActivityAt", optionalText)} placeholder="带时区的 ISO 时间" /></AdminField>
      <AdminField label="标题" wide><input className={adminInput} {...register("title")} required /></AdminField>
      <AdminField label="原始链接" wide><input className={adminInput} {...register("url")} type="url" required /></AdminField>
      <AdminField label="备注" wide><textarea className={adminInput} {...register("note", optionalText)} rows={2} /></AdminField>
      <WorkLinks anime={anime} currentAnimeId={animeId} selected={selected} onChange={ids => setValue("animeIds", ids, { shouldDirty: true })} />
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2"><input {...register("isActive")} type="checkbox" />启用</label>
      {item && (
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
            disabled={save.isPending || remove.isPending || !deleteReason.trim()}
            onClick={() => {
              if (!window.confirm(`确认彻底删除这条讨论？它将从 ${item.sharedAnimeCount} 部作品及 Feed 撤下。`)) return;
              remove.mutate({ id: item.id, reason: deleteReason.trim() });
            }}
            type="button"
          ><Trash2 size={13} />彻底删除</button>
        </div>
      )}
      <FormErrors errors={errors} error={save.error ?? remove.error} />
      <ResourceActions busy={save.isPending || remove.isPending} animeId={animeId} kind="discussion" id={item && item.sharedAnimeCount > 1 ? item.id : undefined} deleteLabel="从本作移除" />
    </form>
  );
}

export function DiscussionsEditor({ items, anime, animeId }: {
  animeId: string;
  items: AdminDiscussion[]; anime: AdminAnimeSummary[]; }) {
  return (
    <section className="border border-line bg-raised px-4 xl:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2 pt-4"><div><h4 className="text-sm font-bold">集中讨论</h4><p className="mt-1 text-[10px] text-muted">综合串只保存一份，可同时出现在多部作品页。</p></div></div>
      {items.map((item) => <ResourceDetails key={item.id} title={item.title} meta={`${item.isActive ? item.platform : "停用"}${item.sharedAnimeCount > 1 ? ` · 跨 ${item.sharedAnimeCount} 部作品` : ""}`}><DiscussionForm item={item} anime={anime} animeId={animeId} /></ResourceDetails>)}
      <ResourceDetails title="新增讨论串" meta="＋"><DiscussionForm anime={anime} animeId={animeId} /></ResourceDetails>
    </section>
  );
}
