import type { FormEvent } from "react";
import type { AdminStaffCredit, StaffWrite } from "@/domain";
import type { ResourceSave } from "./anime-resources-editor";
import { AdminField, adminInput, formInteger, formText, ResourceActions, ResourceDetails } from "./resource-form";

function write(form: FormData, personId?: string): StaffWrite {
  return {
    personId: personId ?? null,
    name: formText(form, "name") ?? "",
    nameNative: formText(form, "nameNative"),
    primaryKind: String(form.get("primaryKind")) as StaffWrite["primaryKind"],
    role: formText(form, "role") ?? "",
    profileUrl: formText(form, "profileUrl"),
    sortOrder: formInteger(form, "sortOrder") ?? 0,
  };
}

function StaffForm({ item, busy, onSave, onDelete }: {
  item?: AdminStaffCredit;
  busy: boolean;
  onSave: ResourceSave;
  onDelete?: () => void;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("staff", write(new FormData(event.currentTarget), item?.personId), item?.id); } catch { /* shown by parent */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="姓名"><input className={adminInput} name="name" defaultValue={item?.name ?? ""} required /></AdminField>
      <AdminField label="原文名"><input className={adminInput} name="nameNative" defaultValue={item?.nameNative ?? ""} /></AdminField>
      <AdminField label="职务"><input className={adminInput} name="role" defaultValue={item?.role ?? ""} required /></AdminField>
      <AdminField label="类型"><select className={adminInput} name="primaryKind" defaultValue={item?.primaryKind ?? "staff"}><option value="author">作者</option><option value="staff">Staff</option><option value="artist">创作者</option><option value="organization">组织</option><option value="cast">Cast</option></select></AdminField>
      <AdminField label="资料链接"><input className={adminInput} name="profileUrl" type="url" defaultValue={item?.profileUrl ?? ""} /></AdminField>
      <AdminField label="排序"><input className={adminInput} name="sortOrder" type="number" min="0" max="10000" defaultValue={item?.sortOrder ?? 0} /></AdminField>
      <ResourceActions busy={busy} onDelete={onDelete} />
    </form>
  );
}

export function StaffEditor({ items, busyKey, onSave, onDelete }: {
  items: AdminStaffCredit[];
  busyKey: string | null;
  onSave: ResourceSave;
  onDelete: (kind: "staff", id: string) => Promise<void>;
}) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">Staff</h4>
      {items.map((item) => (
        <ResourceDetails key={item.id} title={item.name} meta={item.role}>
          <StaffForm item={item} busy={busyKey === `staff:${item.id}`} onSave={onSave} onDelete={() => void onDelete("staff", item.id)} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增 Staff" meta="＋"><StaffForm busy={busyKey === "staff:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
