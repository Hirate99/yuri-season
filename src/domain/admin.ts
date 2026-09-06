import type { z } from "zod";
import type { resourceEnvelopeSchema, resourceKindSchema } from "./inputs/resources";
import type { seasonSchema } from "./inputs/season";
import type {
  AnimePatch,
  AnimeSummary,
  BroadcastSlot,
  SeasonSummary,
  ThemeSongKind,
} from "./catalog";
import type {
  ContentClass,
  PresentationMode,
  SafetyRating,
  SourceIdentity,
  SpoilerLevel,
} from "./feed";

export type CandidateStatus = "pending" | "published" | "held" | "rejected";
export type ReviewDecision = "publish" | "hold" | "reject" | "withdraw";

export type FeedCandidate = {
  id: string;
  animeId: string | null;
  animeTitle: string | null;
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
  presentationMode: PresentationMode;
  safetyRating: SafetyRating;
  spoilerLevel: SpoilerLevel;
  confidence: number;
  status: CandidateStatus;
  discoveredBy: string;
  personName: string | null;
  characterName: string | null;
  evidenceCount: number;
  reviewReasons: string[];
};

export type ResearchRun = {
  id: string;
  triggerType: "cron" | "admin" | "local_skill";
  status: "running" | "completed" | "failed" | "skipped";
  sourceCount: number;
  observationCount: number;
  candidateCount: number;
  publishedCount: number;
  heldCount: number;
  rejectedCount: number;
  jobCount: number;
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type SourceHealth = {
  id: string;
  animeTitle: string | null;
  label: string;
  sourceType: string;
  changeKind: "catalog_metadata" | "feed_candidate";
  trustLevel: string;
  cadenceProfile: "rapid" | "standard" | "local";
  url: string;
  itemUrlTemplate: string | null;
  pollIntervalMin: number;
  enabled: boolean;
  nextCheckAt: string | null;
  lastCheckedAt: string | null;
  failureCount: number;
  lastError: string | null;
};

export type UpdateJob = {
  id: string;
  jobType: string;
  scopeType: string;
  scopeId: string | null;
  executionTarget: "worker" | "local";
  status: "planned" | "leased" | "running" | "completed" | "partial" | "retry" | "dead";
  priority: number;
  attemptCount: number;
  scheduledAt: string;
  leaseOwner: string | null;
  leaseUntil: string | null;
  lastHeartbeatAt: string | null;
  lastError: string | null;
};

export type AdminPublication = {
  id: string;
  candidateId: string;
  animeTitle: string | null;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  autoPublished: boolean;
};

export type AuditEntry = {
  id: string;
  actorType: "system" | "llm" | "admin" | "local_skill";
  action: string;
  entityType: string;
  entityId: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type AdminDashboard = {
  counts: {
    anime: number;
    held: number;
    sources: number;
    activeDiscussions: number;
    autoPublished: number;
  };
  anime: AdminAnimeSummary[];
  coverage: AdminAnimeCoverage[];
  heldCandidates: FeedCandidate[];
  sources: SourceHealth[];
  recentRuns: ResearchRun[];
  recentJobs: UpdateJob[];
  recentPublications: AdminPublication[];
  recentAudit: AuditEntry[];
  seasons: SeasonSummary[];
};

export type AdminAnimeCoverage = {
  animeId: string;
  animeTitle: string;
  seasonId: string;
  hasCover: boolean;
  broadcasts: number;
  staff: number;
  cast: number;
  mainCharacters: number;
  mainCharacterExpected: number | null;
  sourcedMainCharacters: number;
  namedMainCharacters: number;
  auditedMainBirthdays: number;
  verifiedMainBirthdays: number;
  verifiedAccounts: number;
  sources: number;
  verifiedEvents: number;
  media: number;
  discussions: number;
  themeSongs: number;
  themeSongCovers: number;
};

export type AdminAnimeSummary = AnimeSummary & {
  seasonId: string;
  seasonLabel: string;
};

export type AdminAccount = {
  id: string;
  ownerType: "anime" | "person" | "organization";
  ownerId: string;
  ownerLabel: string;
  platform: string;
  handle: string | null;
  url: string;
  verified: boolean;
  monitorMode: "api" | "rss" | "page" | "local" | "disabled";
  verificationSourceUrl: string | null;
  verifiedAt: string | null;
};

export type AdminStaffCredit = {
  id: string;
  personId: string;
  name: string;
  nameNative: string | null;
  primaryKind: "author" | "staff" | "cast" | "artist" | "organization";
  role: string;
  profileUrl: string | null;
  sortOrder: number;
};

export type AdminCastCredit = {
  id: string;
  characterId: string;
  characterName: string;
  characterNameNative: string | null;
  nameSourceUrl: string | null;
  characterProfile: string | null;
  profileSourceUrl: string | null;
  portraitUrl: string | null;
  portraitSourceUrl: string | null;
  isMainGroup: boolean;
  personId: string;
  personName: string;
  personNameNative: string | null;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayYear: number | null;
  birthdayTimezone: string;
  birthdaySourceUrl: string | null;
  birthdayVerified: boolean;
  sortOrder: number;
};

export type AdminSource = {
  id: string;
  accountId: string | null;
  sourceType:
    | "official_page"
    | "official_json"
    | "rss"
    | "bangumi"
    | "youtube"
    | "bluesky"
    | "mastodon"
    | "community"
    | "social";
  changeKind: "catalog_metadata" | "feed_candidate";
  label: string;
  url: string;
  itemUrlTemplate: string | null;
  trustLevel: "official" | "verified_creator" | "community" | "unverified";
  publicTextMode: "full" | "full_with_translation" | "excerpt" | "summary_only" | "link_only";
  maxPublicCharacters: number;
  pollIntervalMin: number;
  cadenceProfile: "rapid" | "standard" | "local";
  enabled: boolean;
};

export type AdminEvent = {
  id: string;
  personId: string | null;
  characterId: string | null;
  eventType: "broadcast" | "anniversary" | "stream" | "radio" | "event" | "release";
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  recurrenceRule: string | null;
  sourceUrl: string | null;
  verified: boolean;
  status: "scheduled" | "completed" | "cancelled";
};

export type AdminMedia = {
  id: string;
  personId: string | null;
  characterId: string | null;
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

export type AdminDiscussion = {
  id: string;
  platform: string;
  title: string;
  url: string;
  note: string | null;
  isActive: boolean;
  lastActivityAt: string | null;
  lastCheckedAt: string | null;
  sharedAnimeCount: number;
  animeIds?: string[];
};

export type AdminThemeSong = {
  id: string;
  trackId: string;
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
  sourceUrl: string | null;
  verified: boolean;
  sortOrder: number;
  sharedAnimeCount: number;
};

export type AdminAnimeResources = {
  broadcasts: BroadcastSlot[];
  accounts: AdminAccount[];
  staff: AdminStaffCredit[];
  cast: AdminCastCredit[];
  sources: AdminSource[];
  events: AdminEvent[];
  media: AdminMedia[];
  discussions: AdminDiscussion[];
  themeSongs: AdminThemeSong[];
};

export type AdminResourceKind = z.output<typeof resourceKindSchema>;

export type AdminResourceWrite = z.output<typeof resourceEnvelopeSchema>;

export type BroadcastWrite = Extract<AdminResourceWrite, { kind: "broadcast" }>["value"];
export type AccountWrite = Extract<AdminResourceWrite, { kind: "account" }>["value"];
export type StaffWrite = Extract<AdminResourceWrite, { kind: "staff" }>["value"];
export type CastWrite = Extract<AdminResourceWrite, { kind: "cast" }>["value"];
export type SourceWrite = Extract<AdminResourceWrite, { kind: "source" }>["value"];
export type EventWrite = Extract<AdminResourceWrite, { kind: "event" }>["value"];
export type MediaWrite = Extract<AdminResourceWrite, { kind: "media" }>["value"];
export type DiscussionWrite = Extract<AdminResourceWrite, { kind: "discussion" }>["value"];
export type ThemeSongWrite = Extract<AdminResourceWrite, { kind: "theme_song" }>["value"];

export type SeasonWrite = z.output<typeof seasonSchema>;

export type CandidateDraft = {
  observationId?: string | null;
  claimId?: string | null;
  animeId?: string | null;
  animeIds?: string[];
  personId?: string | null;
  characterId?: string | null;
  accountId?: string | null;
  platformObjectId?: string | null;
  originKey?: string | null;
  contentClass: ContentClass;
  sourceIdentity: SourceIdentity;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  sourceAccount?: string | null;
  importance?: number;
  publishedAt: string;
  presentationMode?: PresentationMode;
  safetyRating?: SafetyRating;
  spoilerLevel?: SpoilerLevel;
  confidence?: number;
  discoveredBy?: string;
  extractorVersion?: string;
  policyVersion?: string;
  media?: {
    contentClass: "official_art" | "creator_art" | "fanart" | "fan_video" | "cosplay";
    title: string;
    creatorName: string;
    creatorUrl?: string | null;
    originalUrl: string;
    previewUrl?: string | null;
    presentationMode?: PresentationMode;
    safetyRating?: SafetyRating;
    spoilerLevel?: SpoilerLevel;
    rightsNote?: string | null;
    assets?: CandidateMediaAsset[];
  };
};

export type CandidateMediaAsset = {
  r2Key: string;
  sourceUrl: string;
  contentHash: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  byteSize?: number | null;
  sortOrder: number;
  variant: "original" | "preview" | "thumbnail";
  altText?: string | null;
  rightsStatus: "licensed" | "press_kit" | "official_promo_reviewed";
  rightsBasis: string;
};

export type { AnimePatch };
