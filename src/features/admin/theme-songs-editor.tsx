import type { FormEvent } from "react";
import type { AdminThemeSong, ThemeSongWrite } from "@/domain";
import type { ResourceSave } from "./anime-resources-editor";
import { AdminField, adminInput, formText, ResourceActions, ResourceDetails } from "./resource-form";

const kindLabel = { opening: "OP", ending: "ED", theme: "主题曲", insert: "插曲", image: "角色歌" } as const;

function numberValue(form: FormData, key: string, fallback: number) {
  const parsed = Number(form.get(key));
  return Number.isInteger(parsed) ? parsed : fallback;
}

function write(form: FormData): ThemeSongWrite {
  return {
    trackId: formText(form, "trackId"),
    songKind: (formText(form, "songKind") ?? "opening") as ThemeSongWrite["songKind"],
    sequence: numberValue(form, "sequence", 1),
    title: formText(form, "title") ?? "",
    artist: formText(form, "artist") ?? "",
    lyricist: formText(form, "lyricist"),
    composer: formText(form, "composer"),
    arranger: formText(form, "arranger"),
    episodeRange: formText(form, "episodeRange"),
    officialUrl: formText(form, "officialUrl"),
    coverUrl: formText(form, "coverUrl"),
    coverSourceUrl: formText(form, "coverSourceUrl"),
    sourceUrl: formText(form, "sourceUrl"),
    verified: form.get("verified") === "on",
    sortOrder: numberValue(form, "sortOrder", 0),
  };
}

function ThemeSongForm({ item, busy, onSave, onDelete }: {
  item?: AdminThemeSong; busy: boolean; onSave: ResourceSave; onDelete?: () => void;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("theme_song", write(new FormData(event.currentTarget)), item?.id); } catch { /* parent shows error */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      {item && <input type="hidden" name="trackId" value={item.trackId} />}
      <AdminField label="类型"><select className={adminInput} name="songKind" defaultValue={item?.songKind ?? "opening"}>{Object.entries(kindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></AdminField>
      <AdminField label="序号"><input className={adminInput} name="sequence" type="number" min={1} max={99} defaultValue={item?.sequence ?? 1} required /></AdminField>
      <AdminField label="曲名" wide><input className={adminInput} name="title" defaultValue={item?.title ?? ""} required /></AdminField>
      <AdminField label="演唱" wide><input className={adminInput} name="artist" defaultValue={item?.artist ?? ""} required /></AdminField>
      <AdminField label="作词"><input className={adminInput} name="lyricist" defaultValue={item?.lyricist ?? ""} /></AdminField>
      <AdminField label="作曲"><input className={adminInput} name="composer" defaultValue={item?.composer ?? ""} /></AdminField>
      <AdminField label="编曲"><input className={adminInput} name="arranger" defaultValue={item?.arranger ?? ""} /></AdminField>
      <AdminField label="使用集数"><input className={adminInput} name="episodeRange" defaultValue={item?.episodeRange ?? ""} placeholder="1–6 / 第 8 话" /></AdminField>
      <AdminField label="试听链接" wide><input className={adminInput} name="officialUrl" type="url" defaultValue={item?.officialUrl ?? ""} /></AdminField>
      <AdminField label="唱片封面"><input className={adminInput} name="coverUrl" type="url" defaultValue={item?.coverUrl ?? ""} /></AdminField>
      <AdminField label="封面来源"><input className={adminInput} name="coverSourceUrl" type="url" defaultValue={item?.coverSourceUrl ?? ""} /></AdminField>
      <AdminField label="资料来源" wide><input className={adminInput} name="sourceUrl" type="url" defaultValue={item?.sourceUrl ?? ""} /></AdminField>
      <AdminField label="排序"><input className={adminInput} name="sortOrder" type="number" min={0} defaultValue={item?.sortOrder ?? 0} required /></AdminField>
      <label className="inline-flex items-center gap-2 text-[10px]"><input name="verified" type="checkbox" defaultChecked={item?.verified ?? false} />已验证</label>
      <ResourceActions busy={busy} onDelete={onDelete} />
    </form>
  );
}

export function ThemeSongsEditor({ items, busyKey, onSave, onDelete }: {
  items: AdminThemeSong[]; busyKey: string | null; onSave: ResourceSave;
  onDelete: (kind: "theme_song", id: string) => Promise<void>;
}) {
  return (
    <section className="rounded-2xl bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">主题曲</h4>
      {items.map((item) => <ResourceDetails key={item.id} title={item.title} meta={`${kindLabel[item.songKind]}${item.sequence > 1 ? item.sequence : ""}${item.sharedAnimeCount > 1 ? ` · ${item.sharedAnimeCount} 部作品` : ""}`}><ThemeSongForm item={item} busy={busyKey === `theme_song:${item.id}`} onSave={onSave} onDelete={() => void onDelete("theme_song", item.id)} /></ResourceDetails>)}
      <ResourceDetails title="新增主题曲" meta="＋"><ThemeSongForm busy={busyKey === "theme_song:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
