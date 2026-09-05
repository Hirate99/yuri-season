import type { AdminCastCredit, CastWrite } from "@/domain";
import { castSchema } from "@/domain/inputs/cast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { saveResourceMutation } from "./queries";
import { AdminField, adminInput, FormErrors, optionalInteger, optionalText, ResourceActions, ResourceDetails } from "./resource-form";

function CastForm({ item, animeId }: {
  item?: AdminCastCredit;
  animeId: string;
}) {
  const save = useMutation(saveResourceMutation(animeId, item?.id));
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof castSchema>, unknown, CastWrite>({
    resolver: zodResolver(castSchema),
    defaultValues: item ?? { personId: null, isMainGroup: true, birthdayVerified: false, birthdayTimezone: "Asia/Tokyo", sortOrder: 0 },
  });
  const submit = handleSubmit(value => { save.mutate({ kind: "cast", value }); });
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="角色"><input className={adminInput} {...register("characterName")} required /></AdminField>
      <AdminField label="角色原文"><input className={adminInput} {...register("characterNameNative", optionalText)} /></AdminField>
      <AdminField label="中文名来源" wide><input className={adminInput} {...register("nameSourceUrl", optionalText)} type="url" placeholder="萌娘百科或正式中文来源" /></AdminField>
      <AdminField label="声优"><input className={adminInput} {...register("personName")} required /></AdminField>
      <AdminField label="声优原文"><input className={adminInput} {...register("personNameNative", optionalText)} /></AdminField>
      <AdminField label="角色简介" wide><textarea className={`${adminInput} min-h-16 resize-y`} {...register("characterProfile", optionalText)} /></AdminField>
      <AdminField label="简介公式来源" wide><input className={adminInput} {...register("profileSourceUrl", optionalText)} type="url" /></AdminField>
      <AdminField label="角色头像"><input className={adminInput} {...register("portraitUrl", optionalText)} type="url" /></AdminField>
      <AdminField label="头像来源"><input className={adminInput} {...register("portraitSourceUrl", optionalText)} type="url" /></AdminField>
      <div className="grid grid-cols-3 gap-2 md:col-span-2">
        <AdminField label="生日月"><input className={adminInput} {...register("birthdayMonth", optionalInteger)} type="number" min="1" max="12" /></AdminField>
        <AdminField label="生日"><input className={adminInput} {...register("birthdayDay", optionalInteger)} type="number" min="1" max="31" /></AdminField>
        <AdminField label="年份"><input className={adminInput} {...register("birthdayYear", optionalInteger)} type="number" min="1800" max="3000" /></AdminField>
      </div>
      <AdminField label="生日时区"><input className={adminInput} {...register("birthdayTimezone")} /></AdminField>
      <AdminField label="排序"><input className={adminInput} {...register("sortOrder", { setValueAs: value => value === "" ? 0 : Number(value) })} type="number" min="0" max="10000" /></AdminField>
      <AdminField label="生日来源" wide><input className={adminInput} {...register("birthdaySourceUrl", optionalText)} type="url" /></AdminField>
      <div className="flex flex-wrap gap-5 md:col-span-2">
        <label className="inline-flex items-center gap-2 text-[10px]"><input {...register("isMainGroup")} type="checkbox" />主角团</label>
        <label className="inline-flex items-center gap-2 text-[10px]"><input {...register("birthdayVerified")} type="checkbox" />生日已验证</label>
      </div>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} animeId={animeId} kind="cast" id={item?.id} />
    </form>
  );
}

export function CastEditor({ items, animeId }: {
  items: AdminCastCredit[];
  animeId: string;
}) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">Cast</h4>
      {items.map((item) => (
        <ResourceDetails key={item.id} title={item.characterName} meta={item.personName}>
          <CastForm item={item} animeId={animeId} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增 Cast" meta="＋"><CastForm animeId={animeId} /></ResourceDetails>
    </section>
  );
}
