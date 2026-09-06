import type { animeCreateSchema } from "@/domain/inputs/anime";
import { useFormContext } from "react-hook-form";
import type { z } from "zod";
import { AdminField, adminInput, optionalInteger, optionalText } from "./resource-form";

export function WorkFields() {
  const { register } = useFormContext<z.input<typeof animeCreateSchema>>();

  return (
    <>
      <AdminField label="中文标题">
        <input className={adminInput} {...register("titleZh")} required />
      </AdminField>
      <AdminField label="中文标题来源">
        <input
          className={adminInput}
          {...register("titleZhSourceUrl", optionalText)}
          type="url"
          placeholder="萌娘百科或正式中文来源"
        />
      </AdminField>
      <AdminField label="日文标题">
        <input className={adminInput} {...register("titleJa")} required />
      </AdminField>
      <AdminField label="英文标题" wide>
        <input className={adminInput} {...register("titleEn", optionalText)} />
      </AdminField>
      <AdminField label="简介" wide>
        <textarea
          className={`${adminInput} min-h-28 resize-y leading-6`}
          {...register("synopsis")}
          required
        />
      </AdminField>
      <AdminField label="制作">
        <input className={adminInput} {...register("studio", optionalText)} />
      </AdminField>
      <AdminField label="原作">
        <input className={adminInput} {...register("sourceMaterial", optionalText)} />
      </AdminField>
      <AdminField label="首播时间">
        <input
          className={adminInput}
          {...register("premiereAt")}
          placeholder="2026-10-04T00:30:00+09:00"
          required
        />
      </AdminField>
      <div className="grid grid-cols-2 gap-3">
        <AdminField label="话数">
          <input
            className={adminInput}
            {...register("episodeCount", optionalInteger)}
            type="number"
            min="1"
            max="1000"
          />
        </AdminField>
        <AdminField label="分钟">
          <input
            className={adminInput}
            {...register("episodeDurationMin", optionalInteger)}
            type="number"
            min="1"
            max="300"
          />
        </AdminField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <AdminField label="首播集数">
          <input
            className={adminInput}
            {...register("premiereEpisodeCount", { valueAsNumber: true })}
            type="number"
            min="1"
            max="1000"
          />
        </AdminField>
        <AdminField label="已核验集数">
          <input
            className={adminInput}
            {...register("latestVerifiedEpisode", optionalInteger)}
            type="number"
            min="1"
            max="1000"
          />
        </AdminField>
      </div>
      <AdminField label="集数来源">
        <input
          className={adminInput}
          {...register("latestEpisodeSourceUrl", optionalText)}
          type="url"
        />
      </AdminField>
      <AdminField label="集数核验时间">
        <input
          className={adminInput}
          {...register("latestEpisodeCheckedAt", optionalText)}
          placeholder="2026-08-12T12:00:00+09:00"
        />
      </AdminField>
      <AdminField label="内容标签">
        <select className={adminInput} {...register("yuriKind")}>
          <option value="canon">百合</option>
          <option value="strong">关系向</option>
          <option value="adjacent">女性群像</option>
        </select>
      </AdminField>
      <AdminField label="核实状态">
        <select className={adminInput} {...register("yuriStatus")}>
          <option value="confirmed">已核实</option>
          <option value="pending">观察中</option>
        </select>
      </AdminField>
      <AdminField label="播出状态">
        <select className={adminInput} {...register("status")}>
          <option value="airing">放送中</option>
          <option value="upcoming">即将播出</option>
          <option value="finished">已完结</option>
          <option value="paused">暂停</option>
        </select>
      </AdminField>
      <AdminField label="视觉标识">
        <input className={adminInput} {...register("visualTheme")} pattern="[a-z][a-z0-9-]*" />
      </AdminField>
      <AdminField label="公式站">
        <input className={adminInput} {...register("officialUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="Bangumi">
        <input className={adminInput} {...register("bangumiUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="公式账号">
        <input className={adminInput} {...register("officialXUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="海报">
        <input className={adminInput} {...register("coverUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="海报来源" wide>
        <input className={adminInput} {...register("coverSourceUrl", optionalText)} type="url" />
      </AdminField>
      <AdminField label="主角团公式来源">
        <input
          className={adminInput}
          {...register("mainCharacterSourceUrl", optionalText)}
          type="url"
        />
      </AdminField>
      <AdminField label="主角团人数">
        <input
          className={adminInput}
          {...register("mainCharacterExpectedCount", optionalInteger)}
          type="number"
          min="1"
          max="200"
        />
      </AdminField>
      <AdminField label="主角团核验时间" wide>
        <input
          className={adminInput}
          {...register("mainCharacterCheckedAt", optionalText)}
          placeholder="2026-08-11T23:00:00Z"
        />
      </AdminField>
      <AdminField label="内部备注" wide>
        <textarea
          className={`${adminInput} min-h-20 resize-y`}
          {...register("editorialNote", optionalText)}
        />
      </AdminField>
    </>
  );
}
