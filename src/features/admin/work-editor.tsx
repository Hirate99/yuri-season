import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Save } from "lucide-react";
import type { AdminAnimeSummary, AnimePatch } from "@/domain";
import { Badge } from "@/components/badge";
import { yuriDisplayLabel } from "@/lib/format";
import { cn, primaryButton } from "@/lib/ui";
import { AnimeResourcesEditor, type ResourceGroup } from "./anime-resources-editor";
import { animePatchFromForm, WorkFields } from "./work-form";

type Section = "basic" | ResourceGroup;
const sections: Array<{ id: Section; label: string }> = [
  { id: "basic", label: "基本资料" },
  { id: "people", label: "人物与放送" },
  { id: "content", label: "内容" },
  { id: "monitoring", label: "账号与来源" },
];

export function WorkEditor({ item, anime, busy, onSave }: {
  item: AdminAnimeSummary;
  anime: AdminAnimeSummary[];
  busy: boolean;
  onSave: (id: string, patch: AnimePatch) => Promise<void>;
}) {
  const [section, setSection] = useState<Section>("basic");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(item.id, animePatchFromForm(new FormData(event.currentTarget)));
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5 md:px-7 md:pt-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><Badge>{yuriDisplayLabel(item.yuriKind, item.yuriStatus)}</Badge><span className="text-[10px] text-muted">{item.seasonLabel} · {item.status}</span></div>
          <h2 className="mt-3 text-xl font-bold leading-tight tracking-tight md:text-2xl">{item.titleZh}</h2>
          <p className="mt-1 truncate text-[10px] text-muted">{item.titleJa}</p>
        </div>
        <Link className="inline-flex items-center gap-1 rounded-full bg-[#f4f5f7] px-3 py-2 text-[10px] font-bold" to="/anime/$slug" params={{ slug: item.slug }}>详情<ArrowUpRight size={13} /></Link>
      </header>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-4 md:px-6" aria-label="作品编辑分区">
        {sections.map((entry) => <button className={cn("whitespace-nowrap rounded-full px-3.5 py-2 text-[10px] font-semibold text-muted", section === entry.id && "bg-[#eeeafd] text-[#51459d]")} key={entry.id} onClick={() => setSection(entry.id)}>{entry.label}</button>)}
      </nav>

      {section === "basic" ? (
        <form className="grid gap-4 border-t border-black/[0.05] p-5 md:grid-cols-2 md:p-7" onSubmit={submit}>
          <WorkFields item={item} />
          <footer className="flex flex-wrap items-center justify-between gap-3 pt-3 md:col-span-2">
            <label className="inline-flex items-center gap-2 text-xs"><input name="featured" type="checkbox" defaultChecked={item.featured} />首页精选</label>
            <button className={primaryButton} disabled={busy} type="submit"><Save size={15} />{busy ? "保存中…" : "保存"}</button>
          </footer>
        </form>
      ) : <AnimeResourcesEditor animeId={item.id} anime={anime} group={section} />}
    </article>
  );
}
