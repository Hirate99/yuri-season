import type { ReactNode } from "react";
import type { AnimePatch, AnimeSummary } from "@/domain";

export const workInput = "min-h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-xs outline-none transition placeholder:text-[#a1a5ad] focus:border-[#786bd1]/45 focus:ring-3 focus:ring-[#786bd1]/10";

export function WorkField({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={wide ? "grid gap-1.5 md:col-span-2" : "grid gap-1.5"}><span className="text-[10px] font-bold">{label}</span>{children}</label>;
}

function text(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? "").trim();
  return value || null;
}

function integer(form: FormData, name: string): number | null {
  const value = text(form, name);
  return value === null ? null : Number(value);
}

export function animePatchFromForm(form: FormData): AnimePatch {
  return {
    titleZh: text(form, "titleZh") ?? "",
    titleZhSourceUrl: text(form, "titleZhSourceUrl"),
    titleJa: text(form, "titleJa") ?? "",
    titleEn: text(form, "titleEn"),
    synopsis: text(form, "synopsis") ?? "",
    editorialNote: text(form, "editorialNote"),
    yuriKind: String(form.get("yuriKind")) as AnimePatch["yuriKind"],
    yuriStatus: String(form.get("yuriStatus")) as AnimePatch["yuriStatus"],
    status: String(form.get("status")) as AnimePatch["status"],
    premiereAt: text(form, "premiereAt") ?? "",
    episodeCount: integer(form, "episodeCount"),
    episodeDurationMin: integer(form, "episodeDurationMin"),
    premiereEpisodeCount: integer(form, "premiereEpisodeCount") ?? 1,
    latestVerifiedEpisode: integer(form, "latestVerifiedEpisode"),
    latestEpisodeSourceUrl: text(form, "latestEpisodeSourceUrl"),
    latestEpisodeCheckedAt: text(form, "latestEpisodeCheckedAt"),
    studio: text(form, "studio"),
    sourceMaterial: text(form, "sourceMaterial"),
    officialUrl: text(form, "officialUrl"),
    bangumiUrl: text(form, "bangumiUrl"),
    officialXUrl: text(form, "officialXUrl"),
    coverUrl: text(form, "coverUrl"),
    coverSourceUrl: text(form, "coverSourceUrl"),
    mainCharacterSourceUrl: text(form, "mainCharacterSourceUrl"),
    mainCharacterExpectedCount: integer(form, "mainCharacterExpectedCount"),
    mainCharacterCheckedAt: text(form, "mainCharacterCheckedAt"),
    visualTheme: text(form, "visualTheme") ?? "ink",
    featured: form.get("featured") === "on",
  };
}

export function WorkFields({ item }: { item?: AnimeSummary }) {
  return (
    <>
      <WorkField label="中文标题"><input className={workInput} name="titleZh" defaultValue={item?.titleZh ?? ""} required /></WorkField>
      <WorkField label="中文标题来源"><input className={workInput} name="titleZhSourceUrl" type="url" defaultValue={item?.titleZhSourceUrl ?? ""} placeholder="萌娘百科或正式中文来源" /></WorkField>
      <WorkField label="日文标题"><input className={workInput} name="titleJa" defaultValue={item?.titleJa ?? ""} required /></WorkField>
      <WorkField label="英文标题" wide><input className={workInput} name="titleEn" defaultValue={item?.titleEn ?? ""} /></WorkField>
      <WorkField label="简介" wide><textarea className={`${workInput} min-h-28 resize-y leading-6`} name="synopsis" defaultValue={item?.synopsis ?? ""} required /></WorkField>
      <WorkField label="制作"><input className={workInput} name="studio" defaultValue={item?.studio ?? ""} /></WorkField>
      <WorkField label="原作"><input className={workInput} name="sourceMaterial" defaultValue={item?.sourceMaterial ?? ""} /></WorkField>
      <WorkField label="首播时间"><input className={workInput} name="premiereAt" defaultValue={item?.premiereAt ?? ""} placeholder="2026-10-04T00:30:00+09:00" required /></WorkField>
      <div className="grid grid-cols-2 gap-3">
        <WorkField label="话数"><input className={workInput} name="episodeCount" type="number" min="1" max="1000" defaultValue={item?.episodeCount ?? ""} /></WorkField>
        <WorkField label="分钟"><input className={workInput} name="episodeDurationMin" type="number" min="1" max="300" defaultValue={item?.episodeDurationMin ?? ""} /></WorkField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <WorkField label="首播集数"><input className={workInput} name="premiereEpisodeCount" type="number" min="1" max="1000" defaultValue={item?.premiereEpisodeCount ?? 1} /></WorkField>
        <WorkField label="已核验集数"><input className={workInput} name="latestVerifiedEpisode" type="number" min="1" max="1000" defaultValue={item?.latestVerifiedEpisode ?? ""} /></WorkField>
      </div>
      <WorkField label="集数来源"><input className={workInput} name="latestEpisodeSourceUrl" type="url" defaultValue={item?.latestEpisodeSourceUrl ?? ""} /></WorkField>
      <WorkField label="集数核验时间"><input className={workInput} name="latestEpisodeCheckedAt" defaultValue={item?.latestEpisodeCheckedAt ?? ""} placeholder="2026-08-12T12:00:00+09:00" /></WorkField>
      <WorkField label="内容标签"><select className={workInput} name="yuriKind" defaultValue={item?.yuriKind ?? "adjacent"}><option value="canon">百合</option><option value="strong">关系向</option><option value="adjacent">女性群像</option></select></WorkField>
      <WorkField label="核实状态"><select className={workInput} name="yuriStatus" defaultValue={item?.yuriStatus ?? "pending"}><option value="confirmed">已核实</option><option value="pending">观察中</option></select></WorkField>
      <WorkField label="播出状态"><select className={workInput} name="status" defaultValue={item?.status ?? "upcoming"}><option value="airing">放送中</option><option value="upcoming">即将播出</option><option value="finished">已完结</option><option value="paused">暂停</option></select></WorkField>
      <WorkField label="视觉标识"><input className={workInput} name="visualTheme" defaultValue={item?.visualTheme ?? "ink"} pattern="[a-z][a-z0-9-]*" /></WorkField>
      <WorkField label="公式站"><input className={workInput} name="officialUrl" type="url" defaultValue={item?.officialUrl ?? ""} /></WorkField>
      <WorkField label="Bangumi"><input className={workInput} name="bangumiUrl" type="url" defaultValue={item?.bangumiUrl ?? ""} /></WorkField>
      <WorkField label="公式账号"><input className={workInput} name="officialXUrl" type="url" defaultValue={item?.officialXUrl ?? ""} /></WorkField>
      <WorkField label="海报"><input className={workInput} name="coverUrl" type="url" defaultValue={item?.coverUrl ?? ""} /></WorkField>
      <WorkField label="海报来源" wide><input className={workInput} name="coverSourceUrl" type="url" defaultValue={item?.coverSourceUrl ?? ""} /></WorkField>
      <WorkField label="主角团公式来源"><input className={workInput} name="mainCharacterSourceUrl" type="url" defaultValue={item?.mainCharacterSourceUrl ?? ""} /></WorkField>
      <WorkField label="主角团人数"><input className={workInput} name="mainCharacterExpectedCount" type="number" min="1" max="200" defaultValue={item?.mainCharacterExpectedCount ?? ""} /></WorkField>
      <WorkField label="主角团核验时间" wide><input className={workInput} name="mainCharacterCheckedAt" defaultValue={item?.mainCharacterCheckedAt ?? ""} placeholder="2026-08-11T23:00:00Z" /></WorkField>
      <WorkField label="内部备注" wide><textarea className={`${workInput} min-h-20 resize-y`} name="editorialNote" defaultValue={item?.editorialNote ?? ""} /></WorkField>
    </>
  );
}
