import type { z } from "zod";
import type { animeCreateSchema, animePatchSchema } from "./inputs/anime";
export type YuriKind = "canon" | "strong" | "adjacent";
export type YuriStatus = "confirmed" | "pending";
export type AnimeStatus = "airing" | "upcoming" | "finished" | "paused";

export type Season = {
  id: string;
  slug: string;
  label: string;
  startsOn: string;
  endsOn: string;
};

export type SeasonSummary = Season & {
  isCurrent: boolean;
  animeCount: number;
};

export type SeasonsResponse = {
  seasons: SeasonSummary[];
  currentSlug: string | null;
};

export type Account = {
  id: string;
  platform: string;
  handle: string | null;
  url: string;
  verified: boolean;
};

export type AnimeSource = {
  id: string;
  label: string;
  url: string;
  trustLevel: "official" | "verified_creator" | "community" | "unverified";
  lastCheckedAt: string | null;
};

export type BroadcastSlot = {
  id: string;
  label: string;
  weekday: number;
  localTime: string;
  timezone: string;
  platformUrl: string | null;
  isPrimary: boolean;
};

export type PersonCredit = {
  id: string;
  personId: string;
  role: string;
  name: string;
  nameNative: string | null;
  profileUrl: string | null;
  accounts: Account[];
};

export type CharacterCredit = {
  id: string;
  characterId: string;
  personId: string;
  characterName: string;
  characterNameNative: string | null;
  nameSourceUrl: string | null;
  characterProfile: string | null;
  profileSourceUrl: string | null;
  portraitUrl: string | null;
  portraitSourceUrl: string | null;
  personName: string;
  personNameNative: string | null;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayVerified: boolean;
  accounts: Account[];
};

export type ThemeSongKind = "opening" | "ending" | "theme" | "insert" | "image";

export type ThemeSong = {
  id: string;
  songKind: ThemeSongKind;
  sequence: number;
  title: string;
  artist: string;
  lyricist: string | null;
  composer: string | null;
  arranger: string | null;
  episodeRange: string | null;
  officialUrl: string | null;
  coverUrl: string | null;
  coverSourceUrl: string | null;
  sourceUrl: string;
};

export type AnimeSummary = {
  id: string;
  slug: string;
  titleZh: string;
  titleZhSourceUrl: string | null;
  titleJa: string;
  titleEn: string | null;
  synopsis: string;
  editorialNote: string | null;
  yuriKind: YuriKind;
  yuriStatus: YuriStatus;
  status: AnimeStatus;
  premiereAt: string;
  episodeCount: number | null;
  episodeDurationMin: number | null;
  premiereEpisodeCount: number;
  latestVerifiedEpisode: number | null;
  latestEpisodeSourceUrl: string | null;
  latestEpisodeCheckedAt: string | null;
  currentEpisode: number | null;
  studio: string | null;
  sourceMaterial: string | null;
  officialUrl: string | null;
  bangumiUrl: string | null;
  officialXUrl: string | null;
  coverUrl: string | null;
  coverSourceUrl: string | null;
  mainCharacterSourceUrl: string | null;
  mainCharacterExpectedCount: number | null;
  mainCharacterCheckedAt: string | null;
  visualTheme: string;
  featured: boolean;
  primarySlot: BroadcastSlot | null;
  latestFeedAt: string | null;
  feedCount: number;
};

export type AnimeOption = Pick<AnimeSummary, "id" | "slug" | "titleZh" | "titleJa" | "titleEn">;

export type CatalogAnime = Pick<
  AnimeSummary,
  | "id"
  | "slug"
  | "titleZh"
  | "titleJa"
  | "yuriKind"
  | "yuriStatus"
  | "currentEpisode"
  | "coverUrl"
  | "primarySlot"
>;

export type CalendarEntry = {
  animeId: string;
  animeSlug: string;
  titleZh: string;
  titleJa: string;
  yuriKind: YuriKind;
  yuriStatus: YuriStatus;
  visualTheme: string;
  coverUrl: string | null;
  currentEpisode: number | null;
  slot: BroadcastSlot;
};

export type CalendarEvent = {
  id: string;
  animeId: string | null;
  animeSlug: string | null;
  animeTitle: string | null;
  characterId: string | null;
  characterName: string | null;
  characterPortraitUrl: string | null;
  characterPortraitSourceUrl: string | null;
  eventType: "broadcast" | "birthday" | "anniversary" | "stream" | "radio" | "event" | "release";
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  recurrenceRule: string | null;
  sourceUrl: string | null;
  verified: boolean;
  status: "scheduled" | "completed" | "cancelled";
};

export type AnimeDetail = AnimeSummary & {
  broadcasts: BroadcastSlot[];
  staff: PersonCredit[];
  cast: CharacterCredit[];
  accounts: Account[];
  events: CalendarEvent[];
  themeSongs: ThemeSong[];
  sources: AnimeSource[];
  lastCheckedAt: string | null;
};

export type AnimePageResponse = {
  anime: AnimeDetail;
};

export type AnimeRelatedResponse = {
  feed: import("./feed").FeedItem[];
  media: import("./feed").MediaItem[];
  discussions: import("./feed").Discussion[];
};

export type CatalogResponse = {
  season: Season;
  anime: CatalogAnime[];
  events: CalendarEvent[];
  generatedAt: string;
};

export type CalendarResponse = {
  season: Season;
  entries: CalendarEntry[];
  events: CalendarEvent[];
};

export type AnimePatch = z.output<typeof animePatchSchema>;
export type AnimeCreate = z.output<typeof animeCreateSchema>;
