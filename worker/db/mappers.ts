import type {
  Account,
  AnimeSummary,
  BroadcastSlot,
  FeedItem,
  MediaItem,
} from "@/domain";
import { resolveCurrentEpisode } from "@/lib/episode-progress";
import type { AnimeSummaryRecord } from "./read-models/anime";
import type {
  AccountRow,
  BroadcastRow,
  FeedRow,
  MediaRow,
} from "./rows";

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

export function mapAnime(row: AnimeSummaryRecord): AnimeSummary {
  const primarySlot = row.slotId && row.slotLabel && row.slotWeekday !== null && row.slotLocalTime && row.slotTimezone
    ? {
        id: row.slotId,
        label: row.slotLabel,
        weekday: row.slotWeekday,
        localTime: row.slotLocalTime,
        timezone: row.slotTimezone,
        platformUrl: row.slotPlatformUrl,
        isPrimary: true,
      }
    : null;
  return {
    id: row.id,
    slug: row.slug,
    titleZh: row.titleZh,
    titleZhSourceUrl: row.titleZhSourceUrl,
    titleJa: row.titleJa,
    titleEn: row.titleEn,
    synopsis: row.synopsis,
    editorialNote: row.editorialNote,
    yuriKind: row.yuriKind,
    yuriStatus: row.yuriStatus,
    status: row.status,
    premiereAt: row.premiereAt,
    episodeCount: row.episodeCount,
    episodeDurationMin: row.episodeDurationMin,
    premiereEpisodeCount: row.premiereEpisodeCount,
    latestVerifiedEpisode: row.latestVerifiedEpisode,
    latestEpisodeSourceUrl: row.latestEpisodeSourceUrl,
    latestEpisodeCheckedAt: row.latestEpisodeCheckedAt,
    currentEpisode: resolveCurrentEpisode({
      status: row.status,
      premiereAt: row.premiereAt,
      episodeCount: row.episodeCount,
      premiereEpisodeCount: row.premiereEpisodeCount,
      latestVerifiedEpisode: row.latestVerifiedEpisode,
    }),
    studio: row.studio,
    sourceMaterial: row.sourceMaterial,
    officialUrl: row.officialUrl,
    bangumiUrl: row.bangumiUrl,
    officialXUrl: row.officialXUrl,
    coverUrl: row.coverUrl,
    coverSourceUrl: row.coverSourceUrl,
    mainCharacterSourceUrl: row.mainCharacterSourceUrl,
    mainCharacterExpectedCount: row.mainCharacterExpectedCount,
    mainCharacterCheckedAt: row.mainCharacterCheckedAt,
    visualTheme: row.visualTheme,
    featured: row.featured,
    primarySlot,
    latestFeedAt: row.latestFeedAt,
    feedCount: row.feedCount,
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
    relatedAnime: JSON.parse(row.related_anime_json) as FeedItem["relatedAnime"],
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
