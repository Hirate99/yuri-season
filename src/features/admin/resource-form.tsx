import type { ReactNode } from "react";
import { Save, Trash2 } from "lucide-react";
import { primaryButton } from "@/lib/ui";

export const adminInput = "min-h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-xs outline-none transition placeholder:text-[#a1a5ad] focus:border-[#786bd1]/45 focus:ring-3 focus:ring-[#786bd1]/10";

export function AdminField({ label, children, wide = false }: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "grid gap-1 md:col-span-2" : "grid gap-1"}>
      <span className="text-[9px] font-bold text-muted">{label}</span>
      {children}
    </label>
  );
}

export function ResourceDetails({ title, meta, children, open = false }: {
  title: string;
  meta?: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group rounded-xl bg-[#f7f8fa] px-3.5 open:bg-white open:shadow-[0_8px_24px_rgba(15,23,42,0.06)]" open={open}>
      <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-3 py-3.5 text-xs marker:hidden">
        <strong>{title}</strong><span className="text-[9px] text-muted">{meta ?? "编辑"}</span>
      </summary>
      {children}
    </details>
  );
}

export function ResourceActions({ busy, onDelete }: {
  busy: boolean;
  onDelete?: () => void;
}) {
  return (
    <footer className="flex items-center justify-end gap-2 pt-2 md:col-span-2">
      {onDelete && (
        <button className="inline-flex min-h-9 items-center gap-1 px-2 text-[10px] text-[#8b3048]" disabled={busy} onClick={onDelete} type="button">
          <Trash2 size={13} />删除
        </button>
      )}
      <button className={primaryButton} disabled={busy} type="submit"><Save size={13} />保存</button>
    </footer>
  );
}

export function formText(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? "").trim();
  return value || null;
}

export function formInteger(form: FormData, key: string): number | null {
  const value = formText(form, key);
  return value === null ? null : Number(value);
}
