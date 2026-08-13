import { useState, type FormEvent } from "react";
import type { SeasonSummary, SeasonWrite } from "@/domain";
import { apiClient, rpcData } from "@/lib/api";
import { AdminField, adminInput, formText, ResourceActions, ResourceDetails } from "./resource-form";

function write(form: FormData, current = false): SeasonWrite {
  return {
    slug: formText(form, "slug") ?? "",
    label: formText(form, "label") ?? "",
    startsOn: formText(form, "startsOn") ?? "",
    endsOn: formText(form, "endsOn") ?? "",
    isCurrent: current || form.get("isCurrent") === "on",
  };
}

function SeasonForm({ item, busy, onSave }: {
  item?: SeasonSummary;
  busy: boolean;
  onSave: (value: SeasonWrite, id?: string) => Promise<void>;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await onSave(write(new FormData(event.currentTarget), item?.isCurrent), item?.id); } catch { /* shown by parent */ }
  };
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="标识"><input className={adminInput} name="slug" defaultValue={item?.slug ?? ""} placeholder="2026-autumn" required /></AdminField>
      <AdminField label="名称"><input className={adminInput} name="label" defaultValue={item?.label ?? ""} placeholder="2026 秋" required /></AdminField>
      <AdminField label="开始"><input className={adminInput} name="startsOn" type="date" defaultValue={item?.startsOn ?? ""} required /></AdminField>
      <AdminField label="结束"><input className={adminInput} name="endsOn" type="date" defaultValue={item?.endsOn ?? ""} required /></AdminField>
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2"><input name="isCurrent" type="checkbox" defaultChecked={item?.isCurrent ?? false} disabled={item?.isCurrent} />当季</label>
      <ResourceActions busy={busy} />
    </form>
  );
}

export function SeasonsEditor({ seasons, onChanged }: {
  seasons: SeasonSummary[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async (value: SeasonWrite, id?: string) => {
    setBusyId(id ?? "new");
    setError(null);
    try {
      if (id) {
        await rpcData(apiClient.api.admin.seasons[":id"].$patch({ param: { id }, json: value }));
      } else {
        await rpcData(apiClient.api.admin.seasons.$post({ json: value }));
      }
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      setBusyId(null);
    }
  };
  return (
    <section className="max-w-3xl border border-line bg-raised px-4">
      <h2 className="pt-4 text-sm font-bold">季度</h2>
      {error && <p className="mt-3 border border-line p-2 text-[10px] text-[#8b3048]">{error}</p>}
      {seasons.map((season) => (
        <ResourceDetails key={season.id} title={season.label} meta={`${season.animeCount} 部${season.isCurrent ? " · 当季" : ""}`}>
          <SeasonForm item={season} busy={busyId === season.id} onSave={save} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增季度" meta="＋"><SeasonForm busy={busyId === "new"} onSave={save} /></ResourceDetails>
    </section>
  );
}
