export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export const page =
  "mx-auto w-[calc(100%-2rem)] max-w-[1280px] pt-6 pb-24 md:w-[calc(100%-4rem)] md:pt-8 md:pb-16";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#2a2d32] disabled:opacity-50";

export const textButton =
  "inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-2 text-xs font-bold text-ink transition hover:bg-[#e9ebee]";

export const glassPanel =
  "border border-black/[0.06] bg-white/80 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl";

export const surfaceCard =
  "border border-black/[0.06] bg-white shadow-[0_10px_35px_rgba(15,23,42,0.055)]";
