import type { ReactNode } from "react";
export function Badge({ children, tone = "neutral" }: {
  children: ReactNode;
  tone?: "neutral" | "rose" | "lime" | "amber" | "blue" | "violet";
}) {
  const tones = {
    neutral: "bg-[#eef0f2] text-[#4e535b]",
    rose: "bg-[#fce8ef] text-[#943653]",
    lime: "bg-[#eaf4dc] text-[#4f6f25]",
    amber: "bg-[#faefd8] text-[#855d14]",
    blue: "bg-[#e4eef9] text-[#315f91]",
    violet: "bg-[#eee8fa] text-[#624899]",
  } as const;
  return <span className={`inline-flex w-max items-center rounded-full px-2 py-1 text-[9px] leading-none font-bold ${tones[tone]}`}>{children}</span>;
}
