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
export type PublicTextMode = "full" | "full_with_translation" | "excerpt" | "summary_only" | "link_only" | "withdrawn";
export type SourceStatus = "active" | "unavailable" | "deleted" | "private" | "withdrawn";

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
  relatedAnime?: Array<{
    id: string;
    slug: string;
    title: string;
    coverUrl: string | null;
  }>;
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

export type PublicationDocument = {
  sourceTitle: string | null;
  authorName: string | null;
  sourceLanguage: string | null;
  publicText: string | null;
  publicTranslation: string | null;
  textMode: PublicTextMode;
  sourceStatus: SourceStatus;
  capturedAt: string;
  lastVerifiedAt: string | null;
};

export type PublicationAsset = {
  id: string;
  url: string;
  sourceUrl: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  variant: "original" | "preview" | "thumbnail";
  altText: string | null;
  rightsStatus: "licensed" | "press_kit" | "official_promo_reviewed";
};

export type PublicationCorrection = {
  correctionType: "edit" | "withdraw" | "supersede";
  reason: string;
  createdAt: string;
};

export type PublicationDetailResponse = {
  item: FeedItem;
  document: PublicationDocument | null;
  assets: PublicationAsset[];
  corrections: PublicationCorrection[];
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
