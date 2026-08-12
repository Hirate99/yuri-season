import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="inline-flex items-center gap-1 border-b border-[#9ea39e] py-1 text-xs hover:border-ink" href={href} target="_blank" rel="noreferrer">
      {children}<ArrowUpRight size={13} />
    </a>
  );
}
