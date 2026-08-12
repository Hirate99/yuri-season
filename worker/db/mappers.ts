import type {
  Account,
  AnimeSummary,
  BroadcastSlot,
  CalendarEvent,
  FeedItem,
  MediaItem,
  Season,
} from "@/domain";
import { resolveCurrentEpisode } from "@/lib/episode-progress";
import type {
  AccountRow,
  AnimeRow,
  BroadcastRow,
  EventRow,
  FeedRow,
  MediaRow,
  SeasonRow,
} from "./rows";

export function mapSeason(row: SeasonRow): Season {
  return { id: row.id, slug: row.slug, label: row.label, startsOn: row.starts_on, endsOn: row.ends_on };
}

export function mapAccount(row: AccountRow): Account {
  return { id: row.id, platform: row.platform, handle: row.handle, url: row.url, verified: row.verified === 1 };
}

export function mapBroadcast(row: BroadcastRow): BroadcastSlot {
  return {
    id: row.id,
    label: row.label,
    weekday: row.weekday,
    localTime: row.local_time,
    timezone: row.timezone,
    platformUrl: row.platform_url,
    isPrimary: row.is_primary === 1,
  };
}

export function mapAnime(row: AnimeRow): AnimeSummary {
  const primarySlot = row.slot_id && row.slot_label && row.slot_weekday !== null && row.slot_local_time && row.slot_timezone
    ? {
        id: row.slot_id,
        label: row.slot_label,
        weekday: row.slot_weekday,
        localTime: row.slot_local_time,
        timezone: row.slot_timezone,
        platformUrl: row.slot_platform_url,
        isPrimary: true,
      }
    : null;
  return {
    id: row.id,
    slug: row.slug,
    titleZh: row.title_zh,
    titleZhSourceUrl: row.title_zh_source_url,
    titleJa: row.title_ja,
    titleEn: row.title_en,
    synopsis: row.synopsis,
    editorialNote: row.editorial_note,
    yuriKind: row.yuri_kind,
    yuriStatus: row.yuri_status,
    status: row.status,
    premiereAt: row.premiere_at,
    episodeCount: row.episode_count,
    episodeDurationMin: row.episode_duration_min,
    premiereEpisodeCount: row.premiere_episode_count,
    latestVerifiedEpisode: row.latest_verified_episode,
    latestEpisodeSourceUrl: row.latest_episode_source_url,
    latestEpisodeCheckedAt: row.latest_episode_checked_at,
    currentEpisode: resolveCurrentEpisode({
      status: row.status,
      premiereAt: row.premiere_at,
      episodeCount: row.episode_count,
      premiereEpisodeCount: row.premiere_episode_count,
      latestVerifiedEpisode: row.latest_verified_episode,
    }),
    studio: row.studio,
    sourceMaterial: row.source_material,
    officialUrl: row.official_url,
    bangumiUrl: row.bangumi_url,
    officialXUrl: row.official_x_url,
    coverUrl: row.cover_url,
    coverSourceUrl: row.cover_source_url,
    mainCharacterSourceUrl: row.main_character_source_url,
    mainCharacterExpectedCount: row.main_character_expected_count,
    mainCharacterCheckedAt: row.main_character_checked_at,
    visualTheme: row.visual_theme,
    featured: row.featured === 1,
    primarySlot,
    latestFeedAt: row.latest_feed_at,
    feedCount: row.feed_count,
  };
}

export function mapEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    animeId: row.anime_id,
    animeSlug: row.anime_slug,
    animeTitle: row.anime_title,
    characterId: row.character_id,
    characterName: row.character_name,
    characterPortraitUrl: row.character_portrait_url,
    characterPortraitSourceUrl: row.character_portrait_source_url,
    eventType: row.event_type,
    title: row.title,
    startsAt: row.starts_at,
    timezone: row.timezone,
    recurrenceRule: row.recurrence_rule,
    sourceUrl: row.source_url,
    verified: row.verified === 1,
  };
}

export function mapMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    contentClass: row.content_class,
    title: row.title,
    creatorName: row.creator_name,
    creatorUrl: row.creator_url,
    originalUrl: row.original_url,
    previewUrl: row.preview_url,
    presentationMode: row.presentation_mode,
    safetyRating: row.safety_rating,
    spoilerLevel: row.spoiler_level,
    rightsNote: row.rights_note,
    publishedAt: row.published_at,
  };
}

export function mapFeed(row: FeedRow): FeedItem {
  const media = row.media_id && row.media_content_class && row.media_title && row.creator_name && row.original_url
    ? mapMedia({
        id: row.media_id,
        content_class: row.media_content_class,
        title: row.media_title,
        creator_name: row.creator_name,
        creator_url: row.creator_url,
        original_url: row.original_url,
        preview_url: row.preview_url,
        presentation_mode: row.presentation_mode ?? "link_only",
        safety_rating: row.media_safety_rating ?? "unknown",
        spoiler_level: row.media_spoiler_level ?? "none",
        rights_note: row.rights_note,
        published_at: row.media_published_at ?? row.published_at,
      })
    : null;
  return {
    id: row.id,
    animeId: row.anime_id,
    animeSlug: row.anime_slug,
    animeTitle: row.anime_title,
    animeCoverUrl: row.anime_cover_url,
    personId: row.person_id,
    personName: row.person_name,
    characterId: row.character_id,
    characterName: row.character_name,
    accountId: row.account_id,
    platformObjectId: row.platform_object_id,
    contentClass: row.content_class,
    sourceIdentity: row.source_identity,
    title: row.title,
    summary: row.summary,
    url: row.url,
    sourceName: row.source_name,
    sourceAccount: row.source_account,
    importance: row.importance,
    publishedAt: row.published_at,
    safetyRating: row.safety_rating,
    spoilerLevel: row.spoiler_level,
    autoPublished: row.auto_published === 1,
    pinned: row.is_pinned === 1,
    media,
  };
}
