import type { FormEvent } from "react";
import type { AdminEvent, AdminAnimeResources, EventWrite } from "@/domain";
import type { ResourceSave } from "./anime-resources-editor";
import { ContentLinkFields } from "./content-link-fields";
import { AdminField, adminInput, formText, ResourceActions, ResourceDetails } from "./resource-form";

function write(form: FormData): EventWrite {
  return {
    personId: formText(form, "personId"),
    characterId: formText(form, "characterId"),
    eventType: String(form.get("eventType")) as EventWrite["eventType"],
    title: formText(form, "title") ?? "",
    startsAt: formText(form, "startsAt"),
    endsAt: formText(form, "endsAt"),
    timezone: formText(form, "timezone") ?? "Asia/Tokyo",
    recurrenceRule: formText(form, "recurrenceRule"),
    sourceUrl: formText(form, "sourceUrl"),
    verified: form.get("verified") === "on",
    status: String(form.get("status")) as EventWrite["status"],
  };
}

function EventForm({ item, resources, busy, onSave, onDelete }: {
  item?: AdminEvent;
  resources: AdminAnimeResources;
  busy: boolean;
  onSave: ResourceSave;
  onDelete?: () => void;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("event", write(new FormData(event.currentTarget)), item?.id); } catch { /* parent shows error */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="标题" wide><input className={adminInput} name="title" defaultValue={item?.title ?? ""} required /></AdminField>
      <AdminField label="类型"><select className={adminInput} name="eventType" defaultValue={item?.eventType ?? "event"}><option value="broadcast">放送</option><option value="anniversary">纪念日</option><option value="stream">直播</option><option value="radio">广播</option><option value="event">活动</option><option value="release">发售</option></select></AdminField>
      <AdminField label="状态"><select className={adminInput} name="status" defaultValue={item?.status ?? "scheduled"}><option value="scheduled">预定</option><option value="completed">完成</option><option value="cancelled">取消</option></select></AdminField>
      <AdminField label="开始"><input className={adminInput} name="startsAt" defaultValue={item?.startsAt ?? ""} placeholder="2026-08-20T19:00:00+09:00" /></AdminField>
      <AdminField label="结束"><input className={adminInput} name="endsAt" defaultValue={item?.endsAt ?? ""} placeholder="可空" /></AdminField>
      <AdminField label="时区"><input className={adminInput} name="timezone" defaultValue={item?.timezone ?? "Asia/Tokyo"} required /></AdminField>
      <AdminField label="重复"><input className={adminInput} name="recurrenceRule" defaultValue={item?.recurrenceRule ?? ""} placeholder="FREQ=YEARLY" /></AdminField>
      <ContentLinkFields staff={resources.staff} cast={resources.cast} personId={item?.personId} characterId={item?.characterId} />
      <AdminField label="原始来源" wide><input className={adminInput} name="sourceUrl" type="url" defaultValue={item?.sourceUrl ?? ""} /></AdminField>
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2"><input name="verified" type="checkbox" defaultChecked={item?.verified ?? false} />已验证</label>
      <ResourceActions busy={busy} onDelete={onDelete} />
    </form>
  );
}

export function EventsEditor({ resources, busyKey, onSave, onDelete }: {
  resources: AdminAnimeResources;
  busyKey: string | null;
  onSave: ResourceSave;
  onDelete: (kind: "event", id: string) => Promise<void>;
}) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">事件</h4>
      {resources.events.map((item) => <ResourceDetails key={item.id} title={item.title} meta={item.startsAt ?? "时间待定"}><EventForm item={item} resources={resources} busy={busyKey === `event:${item.id}`} onSave={onSave} onDelete={() => void onDelete("event", item.id)} /></ResourceDetails>)}
      <ResourceDetails title="新增事件" meta="＋"><EventForm resources={resources} busy={busyKey === "event:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
