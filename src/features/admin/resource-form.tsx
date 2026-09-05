import type { AdminResourceKind } from "@/domain";
import { primaryButton } from "@/lib/ui";
import { useMutation } from "@tanstack/react-query";
import { Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { FieldErrors } from "react-hook-form";
import { deleteResourceMutation } from "./queries";

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

export function ResourceActions({ busy, animeId, kind, id, deleteLabel = "删除" }: {
  busy: boolean;
  animeId?: string;
  kind?: Exclude<AdminResourceKind, "source">;
  id?: string;
  deleteLabel?: string;
}) {
  const remove = useMutation(deleteResourceMutation(animeId ?? ""));
  const onDelete = () => {
    const message = kind === "discussion" ? "确认从当前作品移除这个讨论串？讨论串及其他作品关联会保留。" : "确认删除这条资料？";
    if (kind && id && window.confirm(message)) remove.mutate({ kind, id });
  };
  return (
    <footer className="flex items-center justify-end gap-2 pt-2 md:col-span-2">
      {remove.error && <p role="alert" className="mr-auto text-xs text-[#8b3048]">{remove.error.message}</p>}
      {kind && id && animeId && (
        <button className="inline-flex min-h-9 items-center gap-1 px-2 text-[10px] text-[#8b3048]" disabled={busy || remove.isPending} onClick={onDelete} type="button">
          <Trash2 size={13} />{deleteLabel}
        </button>
      )}
      <button className={primaryButton} disabled={busy || remove.isPending} type="submit"><Save size={13} />保存</button>
    </footer>
  );
}

export function FormErrors({ errors, error }: { errors: FieldErrors; error?: Error | null }) {
  const messages = [...Object.values(errors).map(value => value?.message), error?.message];
  return messages.map((message, index) => typeof message === "string"
    ? <p className="text-xs text-[#8b3048] md:col-span-2" role="alert" key={index}>{message}</p> : null);
}

export const optionalText = { setValueAs: (value: string | null | undefined) => value?.trim() || null };
export const optionalInteger = { setValueAs: (value: string | number | null) => value === "" || value == null ? null : Number(value) };
