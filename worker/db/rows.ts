import type {
  ContentClass,
  PresentationMode,
  SafetyRating,
  SourceIdentity,
  SpoilerLevel,
} from "@/domain";

export type BroadcastRow = {
  id: string;
  label: string;
  weekday: number;
  local_time: string;
  timezone: string;
  platform_url: string | null;
  is_primary: number;
};

export type AccountRow = {
  id: string;
  owner_id: string;
  platform: string;
  handle: string | null;
  url: string;
  verified: number;
};

export type MediaRow = {
  id: string;
  content_class: "official_art" | "creator_art" | "fanart" | "fan_video" | "cosplay";
  title: string;
  creator_name: string;
  creator_url: string | null;
  original_url: string;
  preview_url: string | null;
  presentation_mode: PresentationMode;
  safety_rating: SafetyRating;
  spoiler_level: SpoilerLevel;
  rights_note: string | null;
  published_at: string;
};

export type FeedRow = {
  id: string;
  anime_id: string | null;
  anime_slug: string | null;
  anime_title: string | null;
  anime_cover_url: string | null;
  person_id: string | null;
  person_name: string | null;
  character_id: string | null;
  character_name: string | null;
  account_id: string | null;
  platform_object_id: string | null;
  content_class: ContentClass;
  source_identity: SourceIdentity;
  title: string;
  summary: string;
  url: string;
  source_name: string;
  source_account: string | null;
  importance: number;
  published_at: string;
  safety_rating: SafetyRating;
  spoiler_level: SpoilerLevel;
  auto_published: number;
  is_pinned: number;
  media_id: string | null;
  media_content_class: MediaRow["content_class"] | null;
  media_title: string | null;
  creator_name: string | null;
  creator_url: string | null;
  original_url: string | null;
  preview_url: string | null;
  presentation_mode: PresentationMode | null;
  media_safety_rating: SafetyRating | null;
  media_spoiler_level: SpoilerLevel | null;
  rights_note: string | null;
  media_published_at: string | null;
};

export type CountRow = { count: number };
