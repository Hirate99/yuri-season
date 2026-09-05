import { useId } from "react";
import { seasonPalettes, seasonVisuals, type SeasonVisualName } from "@/lib/season-presentation";

export function SeasonGlyphArt({ season, className }: { season: SeasonVisualName; className?: string }) {
  const clipId = `season-glyph-${useId().replaceAll(":", "")}`;
  const gradientId = `${clipId}-gradient`;
  const palette = seasonPalettes[season];
  const { glyph } = seasonVisuals[season];

  return (
    <svg
      aria-hidden="true"
      data-season-art={season}
      className={className}
      viewBox="0 0 640 640"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <text
            x="315"
            y="505"
            textAnchor="middle"
            fontFamily={'"Noto Sans SC", "Noto Sans JP", "Microsoft YaHei UI", sans-serif'}
            fontSize="548"
            fontWeight="700"
            letterSpacing="-34"
          >
            {glyph}
          </text>
        </clipPath>
        <linearGradient id={gradientId} x1="70" y1="50" x2="560" y2="590" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.light} />
          <stop offset="0.48" stopColor={palette.base} />
          <stop offset="1" stopColor={palette.deep} />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect width="640" height="640" fill={`url(#${gradientId})`} />
        <g transform={`rotate(${palette.rotation} 320 320)`}>
          <rect x="-82" y="-48" width="236" height="760" fill={palette.light} />
          <rect x="148" y="-55" width="178" height="760" fill={palette.warm} />
          <rect x="326" y="-50" width="196" height="760" fill={palette.base} />
          <rect x="522" y="-54" width="190" height="760" fill={palette.cool} />
        </g>
        <circle cx="150" cy="170" r="78" fill={palette.light} fillOpacity="0.88" />
        <circle cx="493" cy="476" r="92" fill={palette.deep} fillOpacity="0.88" />
        <circle cx="236" cy="494" r="54" fill={palette.warm} fillOpacity="0.92" />
        <path d="M64 410C166 329 225 352 322 290C410 234 477 173 594 146V229C488 257 431 304 350 353C244 417 174 405 64 496Z" fill="#ffffff" fillOpacity="0.14" />
      </g>
    </svg>
  );
}
