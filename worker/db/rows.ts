import type {
  AnimeStatus,
  ContentClass,
  PresentationMode,
  SafetyRating,
  SourceIdentity,
  SpoilerLevel,
  YuriKind,
  YuriStatus,
} from "@/domain";

export type SeasonRow = {
  id: string;
  slug: string;
  label: string;
  starts_on: string;
  ends_on: string;
};

export type SeasonSummaryRow = SeasonRow & {
  is_current: number;
  anime_count: number;
};

export type AnimeRow = {
  id: string;
  slug: string;
  title_zh: string;
  title_zh_source_url: string | null;
  title_ja: string;
  title_en: string | null;
  synopsis: string;
  editorial_note: string | null;
  yuri_kind: YuriKind;
  yuri_status: YuriStatus;
  status: AnimeStatus;
  premiere_at: string;
  episode_count: number | null;
  episode_duration_min: number | null;
  premiere_episode_count: number;
  latest_verified_episode: number | null;
  latest_episode_source_url: string | null;
  latest_episode_checked_at: string | null;
  studio: string | null;
  source_material: string | null;
  official_url: string | null;
  bangumi_url: string | null;
  official_x_url: string | null;
  cover_url: string | null;
  cover_source_url: string | null;
  main_character_source_url: string | null;
  main_character_expected_count: number | null;
  main_character_checked_at: string | null;
  visual_theme: string;
  featured: number;
  slot_id: string | null;
  slot_label: string | null;
  slot_weekday: number | null;
  slot_local_time: string | null;
  slot_timezone: string | null;
  slot_platform_url: string | null;
  latest_feed_at: string | null;
  feed_count: number;
};

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

export type StaffRow = {
  id: string;
  person_id: string;
  role: string;
  name: string;
  name_native: string | null;
  profile_url: string | null;
};

export type CastRow = {
  id: string;
  character_id: string;
  person_id: string;
  character_name: string;
  character_name_native: string | null;
  name_source_url: string | null;
  character_profile: string | null;
  profile_source_url: string | null;
  portrait_url: string | null;
  portrait_source_url: string | null;
  person_name: string;
  person_name_native: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_verified: number;
};

export type EventRow = {
  id: string;
  anime_id: string | null;
  anime_slug: string | null;
  anime_title: string | null;
  character_id: string | null;
  character_name: string | null;
  character_portrait_url: string | null;
  character_portrait_source_url: string | null;
  event_type: "broadcast" | "birthday" | "anniversary" | "stream" | "radio" | "event" | "release";
  title: string;
  starts_at: string | null;
  timezone: string;
  recurrence_rule: string | null;
  source_url: string | null;
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
