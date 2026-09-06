import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      className="inline-flex items-center gap-1 rounded-md bg-raised px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-accent-soft hover:text-accent"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <ArrowUpRight size={13} />
    </a>
  );
}
