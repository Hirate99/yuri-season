import type { AdminStaffCredit, StaffWrite } from "@/domain";
import { staffSchema } from "@/domain/inputs/staff";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { saveResourceMutation } from "./queries";
import { AdminField, adminInput, FormErrors, optionalText, ResourceActions, ResourceDetails } from "./resource-form";

function StaffForm({ item, animeId }: {
  animeId: string;
  item?: AdminStaffCredit;
}) {
  const save = useMutation(saveResourceMutation(animeId, item?.id));
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof staffSchema>, unknown, StaffWrite>({
    resolver: zodResolver(staffSchema), defaultValues: item ?? { personId: null, primaryKind: "staff", sortOrder: 0 },
  });
  const submit = handleSubmit(value => { save.mutate({ kind: "staff", value }); });
  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="姓名"><input className={adminInput} {...register("name")} required /></AdminField>
      <AdminField label="原文名"><input className={adminInput} {...register("nameNative", optionalText)} /></AdminField>
      <AdminField label="职务"><input className={adminInput} {...register("role")} required /></AdminField>
      <AdminField label="类型"><select className={adminInput} {...register("primaryKind")}><option value="author">作者</option><option value="staff">Staff</option><option value="artist">创作者</option><option value="organization">组织</option><option value="cast">Cast</option></select></AdminField>
      <AdminField label="资料链接"><input className={adminInput} {...register("profileUrl", optionalText)} type="url" /></AdminField>
      <AdminField label="排序"><input className={adminInput} {...register("sortOrder", { valueAsNumber: true })} type="number" min="0" max="10000" /></AdminField>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} animeId={animeId} kind="staff" id={item?.id} />
    </form>
  );
}

export function StaffEditor({ items, animeId }: {
  animeId: string;
  items: AdminStaffCredit[];
}) {
  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">Staff</h4>
      {items.map((item) => (
        <ResourceDetails key={item.id} title={item.name} meta={item.role}>
          <StaffForm item={item} animeId={animeId} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增 Staff" meta="＋"><StaffForm animeId={animeId} /></ResourceDetails>
    </section>
  );
}
