import type { FormEvent } from "react";
import type { AdminDiscussion, DiscussionWrite } from "@/domain";
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
  };
}

function DiscussionForm({ item, busy, onSave, onDelete }: {
  item?: AdminDiscussion; busy: boolean; onSave: ResourceSave; onDelete?: () => void;
}) {
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
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2"><input name="isActive" type="checkbox" defaultChecked={item?.isActive ?? true} />启用</label>
      <ResourceActions busy={busy} onDelete={onDelete} />
    </form>
  );
}

export function DiscussionsEditor({ items, busyKey, onSave, onDelete }: {
  items: AdminDiscussion[]; busyKey: string | null; onSave: ResourceSave;
  onDelete: (kind: "discussion", id: string) => Promise<void>;
}) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">集中讨论</h4>
      {items.map((item) => <ResourceDetails key={item.id} title={item.title} meta={`${item.isActive ? item.platform : "停用"}${item.sharedAnimeCount > 1 ? ` · ${item.sharedAnimeCount} 部作品` : ""}`}><DiscussionForm item={item} busy={busyKey === `discussion:${item.id}`} onSave={onSave} onDelete={() => void onDelete("discussion", item.id)} /></ResourceDetails>)}
      <ResourceDetails title="新增讨论串" meta="＋"><DiscussionForm busy={busyKey === "discussion:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
