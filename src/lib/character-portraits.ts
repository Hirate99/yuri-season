import type { CalendarEvent } from "@/domain";

export type VerifiedCharacterPortrait = {
  imageUrl: string;
  sourceUrl: string;
};

export function characterPortraitObjectPosition(url: string): string {
  if (url.includes("dodge-danko.com/assets/webp/sp/character/")) return "50% 20%";
  if (/\/comment-cast-\d+-ico\.png(?:\?|$)/.test(url)) return "left center";
  return "center";
}

export function verifiedBirthdayPortrait(
  event: Pick<CalendarEvent, "eventType" | "verified" | "characterPortraitUrl" | "characterPortraitSourceUrl">,
): VerifiedCharacterPortrait | null {
  if (event.eventType !== "birthday" || !event.verified
    || !event.characterPortraitUrl || !event.characterPortraitSourceUrl) return null;
  return { imageUrl: event.characterPortraitUrl, sourceUrl: event.characterPortraitSourceUrl };
}
