import type { AdminAnimeResources, AdminMedia, MediaWrite } from "@/domain";
import { mediaSchema } from "@/domain/inputs/media";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ContentLinkFields } from "./content-link-fields";
import { saveResourceMutation } from "./queries";
import { AdminField, adminInput, FormErrors, optionalText, ResourceActions, ResourceDetails } from "./resource-form";

function MediaForm({ item, resources, animeId }: {
  animeId: string;
  item?: AdminMedia; resources: AdminAnimeResources; }) {
  const save = useMutation(saveResourceMutation(animeId, item?.id));
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof mediaSchema>, unknown, MediaWrite>({
    resolver: zodResolver(mediaSchema), defaultValues: item ?? { contentClass: "creator_art", presentationMode: "link_only", safetyRating: "unknown", spoilerLevel: "none" },
  });
  const submit = handleSubmit(value => { save.mutate({ kind: "media", value }); });
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="标题" wide><input className={adminInput} {...register("title")} required /></AdminField>
      <AdminField label="类别"><select className={adminInput} {...register("contentClass")}><option value="official_art">公式视觉</option><option value="creator_art">作者 / Staff 绘图</option><option value="fanart">同人插画</option><option value="fan_video">同人视频</option><option value="cosplay">Cosplay</option></select></AdminField>
      <AdminField label="作者"><input className={adminInput} {...register("creatorName")} required /></AdminField>
      <AdminField label="作者主页"><input className={adminInput} {...register("creatorUrl", optionalText)} type="url" /></AdminField>
      <AdminField label="发布时间"><input className={adminInput} {...register("publishedAt")} placeholder="2026-08-11T12:00:00+09:00" required /></AdminField>
      <ContentLinkFields staff={resources.staff} cast={resources.cast} personField={register("personId", optionalText)} characterField={register("characterId", optionalText)} />
      <AdminField label="原始链接" wide><input className={adminInput} {...register("originalUrl")} type="url" required /></AdminField>
      <AdminField label="预览图" wide><input className={adminInput} {...register("previewUrl", optionalText)} type="url" /></AdminField>
      <AdminField label="展示"><select className={adminInput} {...register("presentationMode")}><option value="link_only">仅原链</option><option value="platform_embed">平台嵌入</option><option value="remote_preview">远程预览</option><option value="mirrored_with_permission">获授权镜像</option></select></AdminField>
      <AdminField label="分级"><select className={adminInput} {...register("safetyRating")}><option value="safe">安全</option><option value="suggestive">暗示性</option><option value="unknown">未知</option><option value="adult">成人</option></select></AdminField>
      <AdminField label="剧透"><select className={adminInput} {...register("spoilerLevel")}><option value="none">无</option><option value="mild">轻微</option><option value="major">重大</option></select></AdminField>
      <AdminField label="授权说明" wide><textarea className={adminInput} {...register("rightsNote", optionalText)} rows={2} /></AdminField>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} animeId={animeId} kind="media" id={item?.id} />
    </form>
  );
}

export function MediaEditor({ resources, animeId }: {
  animeId: string;
  resources: AdminAnimeResources; }) {
  return (
    <section className="border border-line bg-raised px-4 xl:col-span-2">
      <h4 className="pt-4 text-sm font-bold">贺图 / 同人</h4>
      {resources.media.map((item) => <ResourceDetails key={item.id} title={item.title} meta={`${item.creatorName} · ${item.safetyRating}`}><MediaForm item={item} resources={resources} animeId={animeId} /></ResourceDetails>)}
      <ResourceDetails title="新增媒体" meta="＋"><MediaForm resources={resources} animeId={animeId} /></ResourceDetails>
    </section>
  );
}
