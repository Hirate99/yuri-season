import type { BroadcastSlot, BroadcastWrite } from "@/domain";
import { broadcastSchema } from "@/domain/inputs/broadcast";
import { weekdayLabel } from "@/lib/format";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { saveResourceMutation } from "./queries";
import {
  AdminField,
  adminInput,
  FormErrors,
  optionalText,
  ResourceActions,
  ResourceDetails,
} from "./resource-form";

const weekdays = [0, 1, 2, 3, 4, 5, 6];

function BroadcastForm({ item, animeId }: { animeId: string; item?: BroadcastSlot }) {
  const save = useMutation(saveResourceMutation(animeId, item?.id));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof broadcastSchema>, unknown, BroadcastWrite>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: item ?? { weekday: 1, timezone: "Asia/Tokyo", isPrimary: false },
  });

  const submit = handleSubmit((value) => {
    save.mutate({ kind: "broadcast", value });
  });

  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="平台">
        <input className={adminInput} {...register("label")} required />
      </AdminField>
      <AdminField label="星期">
        <select className={adminInput} {...register("weekday", { valueAsNumber: true })}>
          {weekdays.map((day) => (
            <option key={day} value={day}>
              {weekdayLabel(day)}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label="公式时间">
        <input
          className={adminInput}
          {...register("localTime")}
          pattern="[0-4]?[0-9]:[0-5][0-9]"
          required
        />
      </AdminField>
      <AdminField label="时区">
        <input className={adminInput} {...register("timezone")} required />
      </AdminField>
      <AdminField label="平台链接" wide>
        <input className={adminInput} {...register("platformUrl", optionalText)} type="url" />
      </AdminField>
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2">
        <input {...register("isPrimary")} type="checkbox" />
        主放送
      </label>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} animeId={animeId} kind="broadcast" id={item?.id} />
    </form>
  );
}

export function BroadcastsEditor({ items, animeId }: { animeId: string; items: BroadcastSlot[] }) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">放送</h4>
      {items.map((item) => (
        <ResourceDetails
          key={item.id}
          title={`${weekdayLabel(item.weekday)} ${item.localTime}`}
          meta={item.label}
        >
          <BroadcastForm item={item} animeId={animeId} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增放送" meta="＋">
        <BroadcastForm animeId={animeId} />
      </ResourceDetails>
    </section>
  );
}
