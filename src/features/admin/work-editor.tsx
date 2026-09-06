import { Badge } from "@/components/badge";
import type { AdminAnimeSummary } from "@/domain";
import { animeCreateSchema } from "@/domain/inputs/anime";
import { yuriDisplayLabel } from "@/lib/format";
import { cn, primaryButton } from "@/lib/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Save } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";
import { AnimeResourcesEditor, type ResourceGroup } from "./anime-resources-editor";
import { patchWorkMutation } from "./queries";
import { FormErrors } from "./resource-form";
import { WorkFields } from "./work-form";

type Section = "basic" | ResourceGroup;
const sections: Array<{ id: Section; label: string }> = [
  { id: "basic", label: "基本资料" },
  { id: "people", label: "人物与放送" },
  { id: "content", label: "内容" },
  { id: "monitoring", label: "账号与来源" },
];

export function WorkEditor({
  item,
  anime,
}: {
  item: AdminAnimeSummary;
  anime: AdminAnimeSummary[];
}) {
  const [section, setSection] = useState<Section>("basic");
  const save = useMutation(patchWorkMutation(item.id));

  const form = useForm<
    z.input<typeof animeCreateSchema>,
    unknown,
    z.output<typeof animeCreateSchema>
  >({ resolver: zodResolver(animeCreateSchema), defaultValues: item });

  const submit = form.handleSubmit((value) => {
    save.mutate(value);
  });

  return (
    <article className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5 md:px-7 md:pt-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{yuriDisplayLabel(item.yuriKind, item.yuriStatus)}</Badge>
            <span className="text-[10px] text-muted">
              {item.seasonLabel} · {item.status}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-bold leading-tight tracking-tight md:text-2xl">
            {item.titleZh}
          </h2>
          <p className="mt-1 truncate text-[10px] text-muted">{item.titleJa}</p>
        </div>
        <Link
          className="inline-flex items-center gap-1 rounded-full bg-[#f4f5f7] px-3 py-2 text-[10px] font-bold"
          to="/anime/$slug"
          params={{ slug: item.slug }}
        >
          详情
          <ArrowUpRight size={13} />
        </Link>
      </header>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-4 md:px-6" aria-label="作品编辑分区">
        {sections.map((entry) => (
          <button
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-2 text-[10px] font-semibold text-muted",
              section === entry.id && "bg-[#eeeafd] text-[#51459d]",
            )}
            key={entry.id}
            onClick={() => setSection(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      {section === "basic" ? (
        <FormProvider {...form}>
          <form
            className="grid gap-4 border-t border-black/[0.05] p-5 md:grid-cols-2 md:p-7"
            onSubmit={submit}
          >
            <WorkFields />
            <FormErrors errors={form.formState.errors} error={save.error} />
            <footer className="flex flex-wrap items-center justify-between gap-3 pt-3 md:col-span-2">
              <label className="inline-flex items-center gap-2 text-xs">
                <input {...form.register("featured")} type="checkbox" />
                首页精选
              </label>
              <button className={primaryButton} disabled={save.isPending} type="submit">
                <Save size={15} />
                {save.isPending ? "保存中…" : "保存"}
              </button>
            </footer>
          </form>
        </FormProvider>
      ) : (
        <AnimeResourcesEditor animeId={item.id} anime={anime} group={section} />
      )}
    </article>
  );
}
