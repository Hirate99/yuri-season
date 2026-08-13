import { useState } from "react";
import { FileJson2, Upload } from "lucide-react";
import type { ResearchBatch } from "@/domain";
import { apiClient, rpcData } from "@/lib/api";
import { primaryButton } from "@/lib/ui";

export function BatchImporter({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!file) return;
    setBusy(true); setMessage(null);
    try {
      const body = JSON.parse(await file.text()) as ResearchBatch;
      const result = await rpcData(apiClient.api.admin.batches.$post({ json: body }));
      setMessage(result.duplicate ? "这个批次已经导入过，没有重复写入。" : `已写入 ${result.observations} 条观察；发布 ${result.published}，待复核 ${result.held}。`);
      onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };
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
