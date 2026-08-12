import type { FormEvent } from "react";
import type { AccountWrite, AdminAccount, AdminAnimeResources } from "@/domain";
import type { ResourceSave } from "./anime-resources-editor";
import { AdminField, adminInput, formText, ResourceActions, ResourceDetails } from "./resource-form";

type Owner = { type: AccountWrite["ownerType"]; id: string; label: string };

function ownerValue(owner: Pick<Owner, "type" | "id">): string {
  return `${owner.type}|${owner.id}`;
}

function ownersFor(animeId: string, resources: AdminAnimeResources): Owner[] {
  const owners = new Map<string, Owner>();
  owners.set(`anime|${animeId}`, { type: "anime", id: animeId, label: "作品公式" });
  for (const credit of [...resources.staff, ...resources.cast.map((item) => ({
    personId: item.personId,
    name: item.personName,
  }))]) {
    owners.set(`person|${credit.personId}`, { type: "person", id: credit.personId, label: credit.name });
  }
  for (const account of resources.accounts) {
    owners.set(ownerValue({ type: account.ownerType, id: account.ownerId }), {
      type: account.ownerType,
      id: account.ownerId,
      label: account.ownerLabel,
    });
  }
  return [...owners.values()];
}

function write(form: FormData): AccountWrite {
  const [ownerType, ownerId] = String(form.get("owner") ?? "").split("|");
  return {
    ownerType: ownerType as AccountWrite["ownerType"],
    ownerId,
    platform: formText(form, "platform") ?? "",
    handle: formText(form, "handle"),
    url: formText(form, "url") ?? "",
    verified: form.get("verified") === "on",
    monitorMode: String(form.get("monitorMode")) as AccountWrite["monitorMode"],
    verificationSourceUrl: formText(form, "verificationSourceUrl"),
  };
}

function AccountForm({ item, owners, busy, onSave, onDelete }: {
  item?: AdminAccount;
  owners: Owner[];
  busy: boolean;
  onSave: ResourceSave;
  onDelete?: () => void;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("account", write(new FormData(event.currentTarget)), item?.id); } catch { /* shown by parent */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="主体">
        <select className={adminInput} name="owner" defaultValue={item ? ownerValue({ type: item.ownerType, id: item.ownerId }) : ownerValue(owners[0])}>
          {owners.map((owner) => <option key={ownerValue(owner)} value={ownerValue(owner)}>{owner.label}</option>)}
        </select>
      </AdminField>
      <AdminField label="平台"><input className={adminInput} name="platform" defaultValue={item?.platform ?? "X"} required /></AdminField>
      <AdminField label="账号"><input className={adminInput} name="handle" defaultValue={item?.handle ?? ""} /></AdminField>
      <AdminField label="监控"><select className={adminInput} name="monitorMode" defaultValue={item?.monitorMode ?? "local"}><option value="local">本地</option><option value="page">页面</option><option value="rss">RSS</option><option value="api">API</option><option value="disabled">停用</option></select></AdminField>
      <AdminField label="主页" wide><input className={adminInput} name="url" type="url" defaultValue={item?.url ?? ""} required /></AdminField>
      <AdminField label="验证来源" wide><input className={adminInput} name="verificationSourceUrl" type="url" defaultValue={item?.verificationSourceUrl ?? ""} /></AdminField>
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2"><input name="verified" type="checkbox" defaultChecked={item?.verified ?? false} />已验证</label>
      <ResourceActions busy={busy} onDelete={onDelete} />
    </form>
  );
}

export function AccountsEditor({ animeId, resources, busyKey, onSave, onDelete }: {
  animeId: string;
  resources: AdminAnimeResources;
  busyKey: string | null;
  onSave: ResourceSave;
  onDelete: (kind: "account", id: string) => Promise<void>;
}) {
  const owners = ownersFor(animeId, resources);
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">账号</h4>
      {resources.accounts.map((item) => (
        <ResourceDetails key={item.id} title={item.handle ?? item.platform} meta={item.ownerLabel}>
          <AccountForm item={item} owners={owners} busy={busyKey === `account:${item.id}`} onSave={onSave} onDelete={() => void onDelete("account", item.id)} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增账号" meta="＋"><AccountForm owners={owners} busy={busyKey === "account:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
