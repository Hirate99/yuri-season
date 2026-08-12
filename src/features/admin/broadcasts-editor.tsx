import type { FormEvent } from "react";
import type { BroadcastSlot, BroadcastWrite } from "@/domain";
import { weekdayLabel } from "@/lib/format";
import type { ResourceSave } from "./anime-resources-editor";
import { AdminField, adminInput, formInteger, formText, ResourceActions, ResourceDetails } from "./resource-form";

const weekdays = [0, 1, 2, 3, 4, 5, 6];

function write(form: FormData): BroadcastWrite {
  return {
    label: formText(form, "label") ?? "",
    weekday: formInteger(form, "weekday") ?? 0,
    localTime: formText(form, "localTime") ?? "",
    timezone: formText(form, "timezone") ?? "Asia/Tokyo",
    platformUrl: formText(form, "platformUrl"),
    isPrimary: form.get("isPrimary") === "on",
  };
}

function BroadcastForm({ item, busy, onSave, onDelete }: {
  item?: BroadcastSlot;
  busy: boolean;
  onSave: ResourceSave;
  onDelete?: () => void;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("broadcast", write(new FormData(event.currentTarget)), item?.id); } catch { /* shown by parent */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="平台"><input className={adminInput} name="label" defaultValue={item?.label ?? ""} required /></AdminField>
      <AdminField label="星期">
        <select className={adminInput} name="weekday" defaultValue={item?.weekday ?? 1}>{weekdays.map((day) => <option key={day} value={day}>{weekdayLabel(day)}</option>)}</select>
      </AdminField>
      <AdminField label="公式时间"><input className={adminInput} name="localTime" defaultValue={item?.localTime ?? "24:00"} pattern="[0-4]?[0-9]:[0-5][0-9]" required /></AdminField>
      <AdminField label="时区"><input className={adminInput} name="timezone" defaultValue={item?.timezone ?? "Asia/Tokyo"} required /></AdminField>
      <AdminField label="平台链接" wide><input className={adminInput} name="platformUrl" type="url" defaultValue={item?.platformUrl ?? ""} /></AdminField>
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2"><input name="isPrimary" type="checkbox" defaultChecked={item?.isPrimary ?? false} />主放送</label>
      <ResourceActions busy={busy} onDelete={onDelete} />
    </form>
  );
}

export function BroadcastsEditor({ items, busyKey, onSave, onDelete }: {
  items: BroadcastSlot[];
  busyKey: string | null;
  onSave: ResourceSave;
  onDelete: (kind: "broadcast", id: string) => Promise<void>;
}) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">放送</h4>
      {items.map((item) => (
        <ResourceDetails key={item.id} title={`${weekdayLabel(item.weekday)} ${item.localTime}`} meta={item.label}>
          <BroadcastForm item={item} busy={busyKey === `broadcast:${item.id}`} onSave={onSave} onDelete={() => void onDelete("broadcast", item.id)} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增放送" meta="＋">
        <BroadcastForm busy={busyKey === "broadcast:new"} onSave={onSave} />
      </ResourceDetails>
    </section>
  );
}
