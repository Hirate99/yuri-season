import type { FormEvent } from "react";
import type { AdminAccount, AdminSource, SourceWrite } from "@/domain";
import type { ResourceSave } from "./anime-resources-editor";
import { AdminField, adminInput, formInteger, formText, ResourceActions, ResourceDetails } from "./resource-form";

function write(form: FormData): SourceWrite {
  return {
    accountId: formText(form, "accountId"),
    sourceType: String(form.get("sourceType")) as SourceWrite["sourceType"],
    changeKind: String(form.get("changeKind")) as SourceWrite["changeKind"],
    label: formText(form, "label") ?? "",
    url: formText(form, "url") ?? "",
    itemUrlTemplate: formText(form, "itemUrlTemplate"),
    trustLevel: String(form.get("trustLevel")) as SourceWrite["trustLevel"],
    pollIntervalMin: formInteger(form, "pollIntervalMin") ?? 1440,
    cadenceProfile: String(form.get("cadenceProfile")) as SourceWrite["cadenceProfile"],
    enabled: form.get("enabled") === "on",
  };
}

function SourceForm({ item, accounts, busy, onSave }: {
  item?: AdminSource;
  accounts: AdminAccount[];
  busy: boolean;
  onSave: ResourceSave;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave("source", write(new FormData(event.currentTarget)), item?.id); } catch { /* shown by parent */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="名称"><input className={adminInput} name="label" defaultValue={item?.label ?? ""} required /></AdminField>
      <AdminField label="账号">
        <select className={adminInput} name="accountId" defaultValue={item?.accountId ?? ""}><option value="">无</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.ownerLabel} · {account.handle ?? account.platform}</option>)}</select>
      </AdminField>
      <AdminField label="来源类型"><select className={adminInput} name="sourceType" defaultValue={item?.sourceType ?? "official_page"}><option value="official_page">公式页面</option><option value="official_json">公式 JSON</option><option value="rss">RSS</option><option value="bangumi">Bangumi</option><option value="youtube">YouTube</option><option value="social">SNS</option><option value="community">社区</option><option value="bluesky">Bluesky</option><option value="mastodon">Mastodon</option></select></AdminField>
      <AdminField label="用途"><select className={adminInput} name="changeKind" defaultValue={item?.changeKind ?? "feed_candidate"}><option value="feed_candidate">动态候选</option><option value="catalog_metadata">资料核对</option></select></AdminField>
      <AdminField label="可信级别"><select className={adminInput} name="trustLevel" defaultValue={item?.trustLevel ?? "official"}><option value="official">公式</option><option value="verified_creator">已验证创作者</option><option value="community">社区</option><option value="unverified">未验证</option></select></AdminField>
      <AdminField label="执行方式"><select className={adminInput} name="cadenceProfile" defaultValue={item?.cadenceProfile ?? "local"}><option value="local">仅本地</option><option value="standard">常规</option><option value="rapid">临时快速</option></select></AdminField>
      <AdminField label="来源链接" wide><input className={adminInput} name="url" type="url" defaultValue={item?.url ?? ""} required /></AdminField>
      <AdminField label="条目链接模板" wide><input className={adminInput} name="itemUrlTemplate" defaultValue={item?.itemUrlTemplate ?? ""} placeholder="https://example.com/news/{id}" /></AdminField>
      <AdminField label="间隔（分钟）"><input className={adminInput} name="pollIntervalMin" type="number" min="30" max="43200" defaultValue={item?.pollIntervalMin ?? 1440} /></AdminField>
      <label className="inline-flex items-end gap-2 pb-2 text-[10px]"><input name="enabled" type="checkbox" defaultChecked={item?.enabled ?? true} />启用（停用会保留抓取历史）</label>
      <ResourceActions busy={busy} />
    </form>
  );
}

export function SourcesEditor({ items, accounts, busyKey, onSave }: {
  items: AdminSource[];
  accounts: AdminAccount[];
  busyKey: string | null;
  onSave: ResourceSave;
}) {
  return (
    <section className="border border-line bg-raised px-4 xl:col-span-2">
      <h4 className="pt-4 text-sm font-bold">来源</h4>
      {items.map((item) => (
        <ResourceDetails key={item.id} title={item.label} meta={item.enabled ? `${item.pollIntervalMin} 分钟` : "停用"}>
          <SourceForm item={item} accounts={accounts} busy={busyKey === `source:${item.id}`} onSave={onSave} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增来源" meta="＋"><SourceForm accounts={accounts} busy={busyKey === "source:new"} onSave={onSave} /></ResourceDetails>
    </section>
  );
}
