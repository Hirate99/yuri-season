import type { FormEvent } from "react";
import { Save } from "lucide-react";
import type { AnimeCreate, SeasonSummary } from "@/domain";
import { primaryButton } from "@/lib/ui";
import { animePatchFromForm, WorkField, WorkFields, workInput } from "./work-form";

export function NewWorkEditor({ seasons, busy, onCreate, open = false }: {
  seasons: SeasonSummary[];
  busy: boolean;
  onCreate: (value: AnimeCreate) => Promise<void>;
  open?: boolean;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await onCreate({
        seasonId: String(form.get("seasonId")),
        slug: String(form.get("slug") ?? "").trim(),
        ...animePatchFromForm(form),
      } as AnimeCreate);
      event.currentTarget.reset();
    } catch { /* shown by parent */ }
  };
  return (
    <details className="rounded-3xl border border-black/[0.06] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.05)]" open={open}>
      <summary className="cursor-pointer list-none p-4 text-sm font-bold marker:hidden">新增作品</summary>
      <form className="grid gap-4 border-t border-black/[0.05] p-5 md:grid-cols-2" onSubmit={submit}>
        <WorkField label="季度"><select className={workInput} name="seasonId" defaultValue={seasons.find((season) => season.isCurrent)?.id}>{seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}</select></WorkField>
        <WorkField label="slug"><input className={workInput} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="anime-title" required /></WorkField>
        <WorkFields />
        <footer className="flex justify-end border-t border-line pt-4 md:col-span-2">
          <button className={primaryButton} disabled={busy} type="submit"><Save size={15} />{busy ? "创建中…" : "创建"}</button>
        </footer>
      </form>
    </details>
  );
}
