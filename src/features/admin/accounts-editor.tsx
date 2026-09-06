import type { AccountWrite, AdminAccount, AdminAnimeResources } from "@/domain";
import { accountSchema } from "@/domain/inputs/account";
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

type Owner = { type: AccountWrite["ownerType"]; id: string; label: string };

function ownerValue(owner: Pick<Owner, "type" | "id">): string {
  return `${owner.type}|${owner.id}`;
}

function ownersFor(animeId: string, resources: AdminAnimeResources): Owner[] {
  const owners = new Map<string, Owner>();

  owners.set(`anime|${animeId}`, { type: "anime", id: animeId, label: "作品公式" });

  for (const credit of [
    ...resources.staff,
    ...resources.cast.map((item) => ({
      personId: item.personId,
      name: item.personName,
    })),
  ]) {
    owners.set(`person|${credit.personId}`, {
      type: "person",
      id: credit.personId,
      label: credit.name,
    });
  }

  for (const account of resources.accounts) {
    owners.set(ownerValue({ type: account.ownerType, id: account.ownerId }), {
      type: account.ownerType,
      id: account.ownerId,
      label: account.ownerLabel,
    });
  }

  return [...owners.values()];
}

function AccountForm({
  item,
  owners,
  animeId,
}: {
  animeId: string;
  item?: AdminAccount;
  owners: Owner[];
}) {
  const save = useMutation(saveResourceMutation(animeId, item?.id));

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof accountSchema>, unknown, AccountWrite>({
    resolver: zodResolver(accountSchema),
    defaultValues: item ?? {
      ownerType: owners[0].type,
      ownerId: owners[0].id,
      platform: "X",
      monitorMode: "local",
      verified: false,
    },
  });

  const submit = handleSubmit((value) => {
    save.mutate({ kind: "account", value });
  });

  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="主体">
        <select
          className={adminInput}
          onChange={(event) => {
            const owner = owners.find((owner) => ownerValue(owner) === event.target.value)!;

            setValue("ownerType", owner.type);
            setValue("ownerId", owner.id);
          }}
          defaultValue={
            item ? ownerValue({ type: item.ownerType, id: item.ownerId }) : ownerValue(owners[0])
          }
        >
          {owners.map((owner) => (
            <option key={ownerValue(owner)} value={ownerValue(owner)}>
              {owner.label}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label="平台">
        <input className={adminInput} {...register("platform")} required />
      </AdminField>
      <AdminField label="账号">
        <input className={adminInput} {...register("handle", optionalText)} />
      </AdminField>
      <AdminField label="监控">
        <select className={adminInput} {...register("monitorMode")}>
          <option value="local">本地</option>
          <option value="page">页面</option>
          <option value="rss">RSS</option>
          <option value="api">API</option>
          <option value="disabled">停用</option>
        </select>
      </AdminField>
      <AdminField label="主页" wide>
        <input className={adminInput} {...register("url")} type="url" required />
      </AdminField>
      <AdminField label="验证来源" wide>
        <input
          className={adminInput}
          {...register("verificationSourceUrl", optionalText)}
          type="url"
        />
      </AdminField>
      <label className="inline-flex items-center gap-2 text-[10px] md:col-span-2">
        <input {...register("verified")} type="checkbox" />
        已验证
      </label>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} animeId={animeId} kind="account" id={item?.id} />
    </form>
  );
}

export function AccountsEditor({
  animeId,
  resources,
}: {
  animeId: string;
  resources: AdminAnimeResources;
}) {
  const owners = ownersFor(animeId, resources);

  return (
    <section className="border border-line bg-raised px-4">
      <h4 className="pt-4 text-sm font-bold">账号</h4>
      {resources.accounts.map((item) => (
        <ResourceDetails key={item.id} title={item.handle ?? item.platform} meta={item.ownerLabel}>
          <AccountForm item={item} owners={owners} animeId={animeId} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增账号" meta="＋">
        <AccountForm owners={owners} animeId={animeId} />
      </ResourceDetails>
    </section>
  );
}
