import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, action }: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-5 md:mb-6">
      <div>{eyebrow && <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">{eyebrow}</p>}<h2 className="text-xl font-bold tracking-[-0.025em] md:text-[26px]">{title}</h2></div>
      {action}
    </div>
  );
}
