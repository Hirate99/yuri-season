import type { SeasonSummary, SeasonWrite } from "@/domain";
import { seasonSchema } from "@/domain/inputs/season";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { saveSeasonMutation } from "./queries";
import {
  AdminField,
  adminInput,
  FormErrors,
  ResourceActions,
  ResourceDetails,
} from "./resource-form";

function SeasonForm({ item }: { item?: SeasonSummary }) {
  const save = useMutation(saveSeasonMutation(item?.id));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof seasonSchema>, unknown, SeasonWrite>({
    resolver: zodResolver(seasonSchema),
    defaultValues: item ?? { isCurrent: false },
  });

  const submit = handleSubmit((value) => {
    save.mutate(value);
  });

  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="标识">
        <input className={adminInput} {...register("slug")} placeholder="2026-autumn" required />
      </AdminField>
      <AdminField label="名称">
        <input className={adminInput} {...register("label")} placeholder="2026 秋" required />
      </AdminField>
      <AdminField label="开始">
        <input className={adminInput} {...register("startsOn")} type="date" required />
      </AdminField>
      <AdminField label="结束">
        <input className={adminInput} {...register("endsOn")} type="date" required />
      </AdminField>
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2">
        <input {...register("isCurrent")} type="checkbox" disabled={item?.isCurrent} />
        当季
      </label>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} />
    </form>
  );
}

export function SeasonsEditor({ seasons }: { seasons: SeasonSummary[] }) {
  return (
    <section className="max-w-3xl border border-line bg-raised px-4">
      <h2 className="pt-4 text-sm font-bold">季度</h2>
      {seasons.map((season) => (
        <ResourceDetails
          key={season.id}
          title={season.label}
          meta={`${season.animeCount} 部${season.isCurrent ? " · 当季" : ""}`}
        >
          <SeasonForm item={season} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增季度" meta="＋">
        <SeasonForm />
      </ResourceDetails>
    </section>
  );
}
