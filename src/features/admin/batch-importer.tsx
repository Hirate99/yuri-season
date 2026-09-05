import type { ResearchBatch } from "@/domain";
import { apiClient, rpcData } from "@/lib/api";
import { primaryButton } from "@/lib/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileJson2, Upload } from "lucide-react";
import { useState } from "react";

export function BatchImporter() {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation({
    mutationFn: async (file: File) => rpcData(apiClient.api.admin.batches.$post({ json: JSON.parse(await file.text()) as ResearchBatch })),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin"] }),
  });
  const result = mutation.data;
  const message = mutation.error?.message ?? (result ? result.duplicate
    ? "这个批次已经导入过，没有重复写入。" : `已写入 ${result.observations} 条观察；发布 ${result.published}，待复核 ${result.held}。` : null);
  const busy = mutation.isPending;
  const submit = () => { if (file) mutation.mutate(file); };
  return (
    <section className="max-w-xl border border-[#acb0a8] bg-raised p-7">
      <FileJson2 className="text-[#679b32]" size={28} />
      <h3 className="mt-6 text-xl font-bold">导入 Codex 增量批次</h3>
      <p className="mt-2 text-xs leading-7 text-muted">批次会先写入 observation 与 evidence，再依据服务器硬规则决定自动发布或进入 Inbox。</p>
      <label className="my-5 grid gap-2"><span className="text-[10px] font-bold">选择 JSON batch</span><input className="rounded-lg border border-dashed border-[#acb0a8] bg-white p-3 text-[10px]" type="file" accept="application/json,.json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <button className={primaryButton} disabled={!file || busy} onClick={submit}><Upload size={16} />{busy ? "正在导入…" : "导入批次"}</button>
      {message && <p className="mt-4 border-l-3 border-signal-rose bg-[#fff1f4] p-3 text-xs text-[#7d263f]">{message}</p>}
    </section>
  );
}
