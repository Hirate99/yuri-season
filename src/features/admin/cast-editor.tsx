import type { FormEvent } from "react";
import type { AdminCastCredit, CastWrite } from "@/domain";
import type { ResourceSave } from "./anime-resources-editor";
import { AdminField, adminInput, formInteger, formText, ResourceActions, ResourceDetails } from "./resource-form";

function write(form: FormData, personId?: string): CastWrite {
  return {
    personId: personId ?? null,
    characterName: formText(form, "characterName") ?? "",
    characterNameNative: formText(form, "characterNameNative"),
    nameSourceUrl: formText(form, "nameSourceUrl"),
    characterProfile: formText(form, "characterProfile"),
    profileSourceUrl: formText(form, "profileSourceUrl"),
    portraitUrl: formText(form, "portraitUrl"),
    portraitSourceUrl: formText(form, "portraitSourceUrl"),
    isMainGroup: form.get("isMainGroup") === "on",
    personName: formText(form, "personName") ?? "",
    personNameNative: formText(form, "personNameNative"),
    birthdayMonth: formInteger(form, "birthdayMonth"),
    birthdayDay: formInteger(form, "birthdayDay"),
    birthdayYear: formInteger(form, "birthdayYear"),
    birthdayTimezone: formText(form, "birthdayTimezone") ?? "Asia/Tokyo",
    birthdaySourceUrl: formText(form, "birthdaySourceUrl"),
    birthdayVerified: form.get("birthdayVerified") === "on",
    sortOrder: formInteger(form, "sortOrder") ?? 0,
  };
}

function CastForm({ item, busy, onSave, onDelete }: {
  item?: AdminCastCredit;
  busy: boolean;
  onSave: ResourceSave;
  onDelete?: () => void;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("cast", write(new FormData(event.currentTarget), item?.personId), item?.id); } catch { /* shown by parent */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="角色"><input className={adminInput} name="characterName" defaultValue={item?.characterName ?? ""} required /></AdminField>
      <AdminField label="角色原文"><input className={adminInput} name="characterNameNative" defaultValue={item?.characterNameNative ?? ""} /></AdminField>
      <AdminField label="中文名来源" wide><input className={adminInput} name="nameSourceUrl" type="url" defaultValue={item?.nameSourceUrl ?? ""} placeholder="萌娘百科或正式中文来源" /></AdminField>
      <AdminField label="声优"><input className={adminInput} name="personName" defaultValue={item?.personName ?? ""} required /></AdminField>
      <AdminField label="声优原文"><input className={adminInput} name="personNameNative" defaultValue={item?.personNameNative ?? ""} /></AdminField>
      <AdminField label="角色简介" wide><textarea className={`${adminInput} min-h-16 resize-y`} name="characterProfile" defaultValue={item?.characterProfile ?? ""} /></AdminField>
      <AdminField label="简介公式来源" wide><input className={adminInput} name="profileSourceUrl" type="url" defaultValue={item?.profileSourceUrl ?? ""} /></AdminField>
      <AdminField label="角色头像"><input className={adminInput} name="portraitUrl" type="url" defaultValue={item?.portraitUrl ?? ""} /></AdminField>
      <AdminField label="头像来源"><input className={adminInput} name="portraitSourceUrl" type="url" defaultValue={item?.portraitSourceUrl ?? ""} /></AdminField>
      <div className="grid grid-cols-3 gap-2 md:col-span-2">
        <AdminField label="生日月"><input className={adminInput} name="birthdayMonth" type="number" min="1" max="12" defaultValue={item?.birthdayMonth ?? ""} /></AdminField>
        <AdminField label="生日"><input className={adminInput} name="birthdayDay" type="number" min="1" max="31" defaultValue={item?.birthdayDay ?? ""} /></AdminField>
        <AdminField label="年份"><input className={adminInput} name="birthdayYear" type="number" min="1800" max="3000" defaultValue={item?.birthdayYear ?? ""} /></AdminField>
      </div>
      <AdminField label="生日时区"><input className={adminInput} name="birthdayTimezone" defaultValue={item?.birthdayTimezone ?? "Asia/Tokyo"} /></AdminField>
      <AdminField label="排序"><input className={adminInput} name="sortOrder" type="number" min="0" max="10000" defaultValue={item?.sortOrder ?? 0} /></AdminField>
      <AdminField label="生日来源" wide><input className={adminInput} name="birthdaySourceUrl" type="url" defaultValue={item?.birthdaySourceUrl ?? ""} /></AdminField>
      <div className="flex flex-wrap gap-5 md:col-span-2">
        <label className="inline-flex items-center gap-2 text-[10px]"><input name="isMainGroup" type="checkbox" defaultChecked={item?.isMainGroup ?? true} />主角团</label>
        <label className="inline-flex items-center gap-2 text-[10px]"><input name="birthdayVerified" type="checkbox" defaultChecked={item?.birthdayVerified ?? false} />生日已验证</label>
      </div>
      <ResourceActions busy={busy} onDelete={onDelete} />
    </form>
  );
}

export function CastEditor({ items, busyKey, onSave, onDelete }: {
  items: AdminCastCredit[];
  busyKey: string | null;
  onSave: ResourceSave;
  onDelete: (kind: "cast", id: string) => Promise<void>;
}) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">Cast</h4>
      {items.map((item) => (
        <ResourceDetails key={item.id} title={item.characterName} meta={item.personName}>
          <CastForm item={item} busy={busyKey === `cast:${item.id}`} onSave={onSave} onDelete={() => void onDelete("cast", item.id)} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增 Cast" meta="＋"><CastForm busy={busyKey === "cast:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
