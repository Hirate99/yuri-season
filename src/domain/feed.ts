export type ContentClass =
  | "schedule"
  | "official_news"
  | "official_art"
  | "creator_art"
  | "birthday"
  | "cast_post"
  | "staff_post"
  | "fanwork"
  | "community_thread"
  | "editorial";

export type SourceIdentity = "official" | "creator" | "cast" | "community" | "editorial";
export type SafetyRating = "safe" | "suggestive" | "adult" | "unknown";
export type SpoilerLevel = "none" | "mild" | "major";
export type PresentationMode = "link_only" | "platform_embed" | "remote_preview" | "mirrored_with_permission";

export type MediaItem = {
  id: string;
  contentClass: "official_art" | "creator_art" | "fanart" | "fan_video" | "cosplay";
  title: string;
  creatorName: string;
  creatorUrl: string | null;
  originalUrl: string;
  previewUrl: string | null;
  presentationMode: PresentationMode;
  safetyRating: SafetyRating;
  spoilerLevel: SpoilerLevel;
  rightsNote: string | null;
  publishedAt: string;
};

export type FeedItem = {
  id: string;
  animeId: string | null;
  animeSlug: string | null;
  animeTitle: string | null;
  animeCoverUrl: string | null;
  personId: string | null;
  personName: string | null;
  characterId: string | null;
  characterName: string | null;
  accountId?: string | null;
  platformObjectId?: string | null;
  contentClass: ContentClass;
  sourceIdentity: SourceIdentity;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  sourceAccount: string | null;
  importance: number;
  publishedAt: string;
  safetyRating: SafetyRating;
  spoilerLevel: SpoilerLevel;
  autoPublished: boolean;
  pinned: boolean;
  media: MediaItem | null;
};

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};

export type Discussion = {
  id: string;
  platform: string;
  title: string;
  url: string;
  note: string | null;
  lastActivityAt: string | null;
  lastCheckedAt: string | null;
};
