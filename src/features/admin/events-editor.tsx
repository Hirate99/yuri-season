import type { AdminAnimeResources, AdminEvent, EventWrite } from "@/domain";
import { eventSchema } from "@/domain/inputs/event";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ContentLinkFields } from "./content-link-fields";
import { saveResourceMutation } from "./queries";
import { AdminField, adminInput, FormErrors, optionalText, ResourceActions, ResourceDetails } from "./resource-form";

function EventForm({ item, resources, animeId }: {
  animeId: string;
  item?: AdminEvent;
  resources: AdminAnimeResources;
}) {
  const save = useMutation(saveResourceMutation(animeId, item?.id));
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof eventSchema>, unknown, EventWrite>({
    resolver: zodResolver(eventSchema), defaultValues: item ?? { timezone: "Asia/Tokyo", eventType: "event", status: "scheduled", verified: false },
  });
  const submit = handleSubmit(value => { save.mutate({ kind: "event", value }); });
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="标题" wide><input className={adminInput} {...register("title")} required /></AdminField>
      <AdminField label="类型"><select className={adminInput} {...register("eventType")}><option value="broadcast">放送</option><option value="anniversary">纪念日</option><option value="stream">直播</option><option value="radio">广播</option><option value="event">活动</option><option value="release">发售</option></select></AdminField>
      <AdminField label="状态"><select className={adminInput} {...register("status")}><option value="scheduled">预定</option><option value="completed">完成</option><option value="cancelled">取消</option></select></AdminField>
      <AdminField label="开始"><input className={adminInput} {...register("startsAt", optionalText)} placeholder="2026-08-20T19:00:00+09:00" /></AdminField>
      <AdminField label="结束"><input className={adminInput} {...register("endsAt", optionalText)} placeholder="可空" /></AdminField>
      <AdminField label="时区"><input className={adminInput} {...register("timezone")} required /></AdminField>
      <AdminField label="重复"><input className={adminInput} {...register("recurrenceRule", optionalText)} placeholder="FREQ=YEARLY" /></AdminField>
      <ContentLinkFields staff={resources.staff} cast={resources.cast} personField={register("personId", optionalText)} characterField={register("characterId", optionalText)} />
      <AdminField label="原始来源" wide><input className={adminInput} {...register("sourceUrl", optionalText)} type="url" /></AdminField>
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2"><input {...register("verified")} type="checkbox" />已验证</label>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} animeId={animeId} kind="event" id={item?.id} />
    </form>
  );
}

export function EventsEditor({ resources, animeId }: {
  animeId: string;
  resources: AdminAnimeResources;
}) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">事件</h4>
      {resources.events.map((item) => <ResourceDetails key={item.id} title={item.title} meta={item.startsAt ?? "时间待定"}><EventForm item={item} resources={resources} animeId={animeId} /></ResourceDetails>)}
      <ResourceDetails title="新增事件" meta="＋"><EventForm resources={resources} animeId={animeId} /></ResourceDetails>
    </section>
  );
}
