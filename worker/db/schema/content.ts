import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const eventsTable = sqliteTable("events", {
  id: text("id").primaryKey(),
  animeId: text("anime_id"),
  personId: text("person_id"),
  characterId: text("character_id"),
  eventType: text("event_type", { enum: ["broadcast", "birthday", "anniversary", "stream", "radio", "event", "release"] }).notNull(),
  title: text("title").notNull(),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  timezone: text("timezone").notNull(),
  recurrenceRule: text("recurrence_rule"),
  sourceUrl: text("source_url"),
  verified: integer("verified", { mode: "boolean" }).notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull(),
});

export const mediaItemsTable = sqliteTable("media_items", {
  id: text("id").primaryKey(),
  animeId: text("anime_id"),
  personId: text("person_id"),
  characterId: text("character_id"),
  contentClass: text("content_class", { enum: ["official_art", "creator_art", "fanart", "fan_video", "cosplay"] }).notNull(),
  title: text("title").notNull(),
  creatorName: text("creator_name").notNull(),
  creatorUrl: text("creator_url"),
  originalUrl: text("original_url").notNull().unique(),
  previewUrl: text("preview_url"),
  presentationMode: text("presentation_mode", { enum: ["link_only", "platform_embed", "remote_preview", "mirrored_with_permission"] }).notNull(),
  safetyRating: text("safety_rating", { enum: ["safe", "suggestive", "adult", "unknown"] }).notNull(),
  spoilerLevel: text("spoiler_level", { enum: ["none", "mild", "major"] }).notNull(),
  rightsNote: text("rights_note"),
  publishedAt: text("published_at").notNull(),
});

export const discussionsTable = sqliteTable("discussions", {
  id: text("id").primaryKey(),
  animeId: text("anime_id").notNull(),
  platform: text("platform").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  note: text("note"),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  lastActivityAt: text("last_activity_at"),
  lastCheckedAt: text("last_checked_at"),
});

export const musicTracksTable = sqliteTable("music_tracks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  lyricist: text("lyricist"),
  composer: text("composer"),
  arranger: text("arranger"),
  officialUrl: text("official_url"),
  coverUrl: text("cover_url"),
  coverSourceUrl: text("cover_source_url"),
  sourceUrl: text("source_url"),
  verified: integer("verified", { mode: "boolean" }).notNull(),
});

export const animeThemeSongsTable = sqliteTable("anime_theme_songs", {
  id: text("id").primaryKey(),
  animeId: text("anime_id").notNull(),
  trackId: text("track_id").notNull(),
  songKind: text("song_kind", { enum: ["opening", "ending", "theme", "insert", "image"] }).notNull(),
  sequence: integer("sequence").notNull(),
  episodeRange: text("episode_range"),
  sortOrder: integer("sort_order").notNull(),
});
