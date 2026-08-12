import type { FormEvent } from "react";
import type { AdminAnimeResources, AdminMedia, MediaWrite } from "@/domain";
import type { ResourceSave } from "./anime-resources-editor";
import { ContentLinkFields } from "./content-link-fields";
import { AdminField, adminInput, formText, ResourceActions, ResourceDetails } from "./resource-form";

function write(form: FormData): MediaWrite {
  return {
    personId: formText(form, "personId"), characterId: formText(form, "characterId"),
    contentClass: String(form.get("contentClass")) as MediaWrite["contentClass"],
    title: formText(form, "title") ?? "", creatorName: formText(form, "creatorName") ?? "",
    creatorUrl: formText(form, "creatorUrl"), originalUrl: formText(form, "originalUrl") ?? "",
    previewUrl: formText(form, "previewUrl"),
    presentationMode: String(form.get("presentationMode")) as MediaWrite["presentationMode"],
    safetyRating: String(form.get("safetyRating")) as MediaWrite["safetyRating"],
    spoilerLevel: String(form.get("spoilerLevel")) as MediaWrite["spoilerLevel"],
    rightsNote: formText(form, "rightsNote"), publishedAt: formText(form, "publishedAt") ?? "",
  };
}

function MediaForm({ item, resources, busy, onSave, onDelete }: {
  item?: AdminMedia; resources: AdminAnimeResources; busy: boolean; onSave: ResourceSave; onDelete?: () => void;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("media", write(new FormData(event.currentTarget)), item?.id); } catch { /* parent shows error */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="标题" wide><input className={adminInput} name="title" defaultValue={item?.title ?? ""} required /></AdminField>
      <AdminField label="类别"><select className={adminInput} name="contentClass" defaultValue={item?.contentClass ?? "creator_art"}><option value="official_art">公式视觉</option><option value="creator_art">作者 / Staff 绘图</option><option value="fanart">同人插画</option><option value="fan_video">同人视频</option><option value="cosplay">Cosplay</option></select></AdminField>
      <AdminField label="作者"><input className={adminInput} name="creatorName" defaultValue={item?.creatorName ?? ""} required /></AdminField>
      <AdminField label="作者主页"><input className={adminInput} name="creatorUrl" type="url" defaultValue={item?.creatorUrl ?? ""} /></AdminField>
      <AdminField label="发布时间"><input className={adminInput} name="publishedAt" defaultValue={item?.publishedAt ?? ""} placeholder="2026-08-11T12:00:00+09:00" required /></AdminField>
      <ContentLinkFields staff={resources.staff} cast={resources.cast} personId={item?.personId} characterId={item?.characterId} />
      <AdminField label="原始链接" wide><input className={adminInput} name="originalUrl" type="url" defaultValue={item?.originalUrl ?? ""} required /></AdminField>
      <AdminField label="预览图" wide><input className={adminInput} name="previewUrl" type="url" defaultValue={item?.previewUrl ?? ""} /></AdminField>
      <AdminField label="展示"><select className={adminInput} name="presentationMode" defaultValue={item?.presentationMode ?? "link_only"}><option value="link_only">仅原链</option><option value="platform_embed">平台嵌入</option><option value="remote_preview">远程预览</option><option value="mirrored_with_permission">获授权镜像</option></select></AdminField>
      <AdminField label="分级"><select className={adminInput} name="safetyRating" defaultValue={item?.safetyRating ?? "unknown"}><option value="safe">安全</option><option value="suggestive">暗示性</option><option value="unknown">未知</option><option value="adult">成人</option></select></AdminField>
      <AdminField label="剧透"><select className={adminInput} name="spoilerLevel" defaultValue={item?.spoilerLevel ?? "none"}><option value="none">无</option><option value="mild">轻微</option><option value="major">重大</option></select></AdminField>
      <AdminField label="授权说明" wide><textarea className={adminInput} name="rightsNote" defaultValue={item?.rightsNote ?? ""} rows={2} /></AdminField>
      <ResourceActions busy={busy} onDelete={onDelete} />
    </form>
  );
}

export function MediaEditor({ resources, busyKey, onSave, onDelete }: {
  resources: AdminAnimeResources; busyKey: string | null; onSave: ResourceSave;
  onDelete: (kind: "media", id: string) => Promise<void>;
}) {
  return (
    <section className="border border-line bg-raised px-4 xl:col-span-2">
      <h4 className="pt-4 text-sm font-bold">贺图 / 同人</h4>
      {resources.media.map((item) => <ResourceDetails key={item.id} title={item.title} meta={`${item.creatorName} · ${item.safetyRating}`}><MediaForm item={item} resources={resources} busy={busyKey === `media:${item.id}`} onSave={onSave} onDelete={() => void onDelete("media", item.id)} /></ResourceDetails>)}
      <ResourceDetails title="新增媒体" meta="＋"><MediaForm resources={resources} busy={busyKey === "media:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
