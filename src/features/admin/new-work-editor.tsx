import type { AnimeCreate, SeasonSummary } from "@/domain";
import { animeCreateSchema } from "@/domain/inputs/anime";
import { primaryButton } from "@/lib/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";
import { createWorkMutation } from "./queries";
import { AdminField, adminInput, FormErrors } from "./resource-form";
import { WorkFields } from "./work-form";

export function NewWorkEditor({
  seasons,
  onCreated,
  open = false,
}: {
  seasons: SeasonSummary[];
  onCreated: () => void;
  open?: boolean;
}) {
  const create = useMutation(createWorkMutation);

  const form = useForm<z.input<typeof animeCreateSchema>, unknown, AnimeCreate>({
    resolver: zodResolver(animeCreateSchema),
    defaultValues: {
      seasonId: seasons.find((season) => season.isCurrent)?.id ?? seasons[0]?.id,
      yuriKind: "adjacent",
      yuriStatus: "pending",
      status: "upcoming",
      premiereEpisodeCount: 1,
      visualTheme: "ink",
      featured: false,
    },
  });

  const submit = form.handleSubmit((value) => {
    create.mutate(value, { onSuccess: onCreated });
  });

  return (
    <details
      className="rounded-3xl border border-black/[0.06] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
      open={open}
    >
      <summary className="cursor-pointer list-none p-4 text-sm font-bold marker:hidden">
        新增作品
      </summary>
      <FormProvider {...form}>
        <form
          className="grid gap-4 border-t border-black/[0.05] p-5 md:grid-cols-2"
          onSubmit={submit}
        >
          <AdminField label="季度">
            <select className={adminInput} {...form.register("seasonId")}>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="slug">
            <input
              className={adminInput}
              {...form.register("slug")}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="anime-title"
              required
            />
          </AdminField>
          <WorkFields />
          <FormErrors errors={form.formState.errors} error={create.error} />
          <footer className="flex justify-end border-t border-line pt-4 md:col-span-2">
            <button className={primaryButton} disabled={create.isPending} type="submit">
              <Save size={15} />
              {create.isPending ? "创建中…" : "创建"}
            </button>
          </footer>
        </form>
      </FormProvider>
    </details>
  );
}
