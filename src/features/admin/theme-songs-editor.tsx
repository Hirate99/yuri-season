import type { AdminThemeSong, ThemeSongWrite } from "@/domain";
import { themeSongSchema } from "@/domain/inputs/theme-song";
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

const kindLabel = {
  opening: "OP",
  ending: "ED",
  theme: "主题曲",
  insert: "插曲",
  image: "角色歌",
} as const;

function ThemeSongForm({ item, animeId }: { animeId: string; item?: AdminThemeSong }) {
  const save = useMutation(saveResourceMutation(animeId, item?.id));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof themeSongSchema>, unknown, ThemeSongWrite>({
    resolver: zodResolver(themeSongSchema),
    defaultValues: item ?? {
      trackId: null,
      songKind: "opening",
      sequence: 1,
      sortOrder: 0,
      verified: false,
    },
  });

  const submit = handleSubmit((value) => {
    save.mutate({ kind: "theme_song", value });
  });

  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      {item && <input type="hidden" {...register("trackId", optionalText)} />}
      <AdminField label="类型">
        <select className={adminInput} {...register("songKind")}>
          {Object.entries(kindLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label="序号">
        <input
          className={adminInput}
          {...register("sequence", { valueAsNumber: true })}
          type="number"
          min={1}
          max={99}
          required
        />
      </AdminField>
      <AdminField label="曲名" wide>
        <input className={adminInput} {...register("title")} required />
      </AdminField>
      <AdminField label="演唱" wide>
        <input className={adminInput} {...register("artist")} required />
      </AdminField>
      <AdminField label="作词">
        <input className={adminInput} {...register("lyricist", optionalText)} />
      </AdminField>
      <AdminField label="作曲">
        <input className={adminInput} {...register("composer", optionalText)} />
      </AdminField>
      <AdminField label="编曲">
        <input className={adminInput} {...register("arranger", optionalText)} />
      </AdminField>
      <AdminField label="使用集数">
        <input
          className={adminInput}
          {...register("episodeRange", optionalText)}
          placeholder="1–6 / 第 8 话"
        />
      </AdminField>
      <AdminField label="试听链接" wide>
        <input className={adminInput} {...register("officialUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="唱片封面">
        <input className={adminInput} {...register("coverUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="封面来源">
        <input className={adminInput} {...register("coverSourceUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="资料来源" wide>
        <input className={adminInput} {...register("sourceUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="排序">
        <input
          className={adminInput}
          {...register("sortOrder", { valueAsNumber: true })}
          type="number"
          min={0}
          required
        />
      </AdminField>
      <label className="inline-flex items-center gap-2 text-[10px]">
        <input {...register("verified")} type="checkbox" />
        已验证
      </label>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} animeId={animeId} kind="theme_song" id={item?.id} />
    </form>
  );
}

export function ThemeSongsEditor({ items, animeId }: { animeId: string; items: AdminThemeSong[] }) {
  return (
    <section className="rounded-2xl bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">主题曲</h4>
      {items.map((item) => (
        <ResourceDetails
          key={item.id}
          title={item.title}
          meta={`${kindLabel[item.songKind]}${item.sequence > 1 ? item.sequence : ""}${item.sharedAnimeCount > 1 ? ` · ${item.sharedAnimeCount} 部作品` : ""}`}
        >
          <ThemeSongForm item={item} animeId={animeId} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增主题曲" meta="＋">
        <ThemeSongForm animeId={animeId} />
      </ResourceDetails>
    </section>
  );
}
