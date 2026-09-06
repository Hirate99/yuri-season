import type { AdminAccount, AdminSource, SourceWrite } from "@/domain";
import { sourceSchema } from "@/domain/inputs/source";
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

function SourceForm({
  item,
  accounts,
  animeId,
}: {
  animeId: string;
  item?: AdminSource;
  accounts: AdminAccount[];
}) {
  const save = useMutation(saveResourceMutation(animeId, item?.id));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof sourceSchema>, unknown, SourceWrite>({
    resolver: zodResolver(sourceSchema),
    defaultValues: item ?? {
      accountId: null,
      sourceType: "official_page",
      changeKind: "feed_candidate",
      trustLevel: "official",
      publicTextMode: "full_with_translation",
      maxPublicCharacters: 24000,
      pollIntervalMin: 1440,
      cadenceProfile: "local",
      enabled: true,
    },
  });

  const submit = handleSubmit((value) => {
    save.mutate({ kind: "source", value });
  });

  return (
    <form className="grid gap-3 pb-4 md:grid-cols-2" onSubmit={submit}>
      <AdminField label="名称">
        <input className={adminInput} {...register("label")} required />
      </AdminField>
      <AdminField label="账号">
        <select className={adminInput} {...register("accountId", optionalText)}>
          <option value="">无</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.ownerLabel} · {account.handle ?? account.platform}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label="来源类型">
        <select className={adminInput} {...register("sourceType")}>
          <option value="official_page">公式页面</option>
          <option value="official_json">公式 JSON</option>
          <option value="rss">RSS</option>
          <option value="bangumi">Bangumi</option>
          <option value="youtube">YouTube</option>
          <option value="social">SNS</option>
          <option value="community">社区</option>
          <option value="bluesky">Bluesky</option>
          <option value="mastodon">Mastodon</option>
        </select>
      </AdminField>
      <AdminField label="用途">
        <select className={adminInput} {...register("changeKind")}>
          <option value="feed_candidate">动态候选</option>
          <option value="catalog_metadata">资料核对</option>
        </select>
      </AdminField>
      <AdminField label="可信级别">
        <select className={adminInput} {...register("trustLevel")}>
          <option value="official">公式</option>
          <option value="verified_creator">已验证创作者</option>
          <option value="community">社区</option>
          <option value="unverified">未验证</option>
        </select>
      </AdminField>
      <AdminField label="公开文字">
        <select className={adminInput} {...register("publicTextMode")}>
          <option value="full_with_translation">原文＋中文翻译</option>
          <option value="full">完整原文</option>
          <option value="excerpt">原文节选</option>
          <option value="summary_only">仅中文摘要</option>
          <option value="link_only">仅原链</option>
        </select>
      </AdminField>
      <AdminField label="公开字符上限">
        <input
          className={adminInput}
          {...register("maxPublicCharacters", { valueAsNumber: true })}
          type="number"
          min="0"
          max="24000"
        />
      </AdminField>
      <AdminField label="执行方式">
        <select className={adminInput} {...register("cadenceProfile")}>
          <option value="local">仅本地</option>
          <option value="standard">常规</option>
          <option value="rapid">临时快速</option>
        </select>
      </AdminField>
      <AdminField label="来源链接" wide>
        <input className={adminInput} {...register("url")} type="url" required />
      </AdminField>
      <AdminField label="条目链接模板" wide>
        <input
          className={adminInput}
          {...register("itemUrlTemplate", optionalText)}
          placeholder="https://example.com/news/{id}"
        />
      </AdminField>
      <AdminField label="间隔（分钟）">
        <input
          className={adminInput}
          {...register("pollIntervalMin", { valueAsNumber: true })}
          type="number"
          min="30"
          max="43200"
        />
      </AdminField>
      <label className="inline-flex items-end gap-2 pb-2 text-[10px]">
        <input {...register("enabled")} type="checkbox" />
        启用（停用会保留抓取历史）
      </label>
      <FormErrors errors={errors} error={save.error} />
      <ResourceActions busy={save.isPending} />
    </form>
  );
}

export function SourcesEditor({
  items,
  accounts,
  animeId,
}: {
  animeId: string;
  items: AdminSource[];
  accounts: AdminAccount[];
}) {
  return (
    <section className="border border-line bg-raised px-4 xl:col-span-2">
      <h4 className="pt-4 text-sm font-bold">来源</h4>
      {items.map((item) => (
        <ResourceDetails
          key={item.id}
          title={item.label}
          meta={item.enabled ? `${item.pollIntervalMin} 分钟` : "停用"}
        >
          <SourceForm item={item} accounts={accounts} animeId={animeId} />
        </ResourceDetails>
      ))}
      <ResourceDetails title="新增来源" meta="＋">
        <SourceForm accounts={accounts} animeId={animeId} />
      </ResourceDetails>
    </section>
  );
}
