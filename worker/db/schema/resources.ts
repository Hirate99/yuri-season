import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const peopleTable = sqliteTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameNative: text("name_native"),
  bio: text("bio"),
  primaryKind: text("primary_kind", { enum: ["author", "staff", "cast", "artist", "organization"] }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const charactersTable = sqliteTable("characters", {
  id: text("id").primaryKey(),
  animeId: text("anime_id").notNull(),
  name: text("name").notNull(),
  nameNative: text("name_native"),
  nameSourceUrl: text("name_source_url"),
  profile: text("profile"),
  profileSourceUrl: text("profile_source_url"),
  portraitUrl: text("portrait_url"),
  portraitSourceUrl: text("portrait_source_url"),
  isMainGroup: integer("is_main_group", { mode: "boolean" }).notNull(),
  birthdayMonth: integer("birthday_month"),
  birthdayDay: integer("birthday_day"),
  birthdayYear: integer("birthday_year"),
  birthdayTimezone: text("birthday_timezone").notNull(),
  birthdaySourceUrl: text("birthday_source_url"),
  birthdayVerified: integer("birthday_verified", { mode: "boolean" }).notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const workCreditsTable = sqliteTable("work_credits", {
  id: text("id").primaryKey(),
  animeId: text("anime_id").notNull(),
  personId: text("person_id").notNull(),
  role: text("role").notNull(),
  profileUrl: text("profile_url"),
  sortOrder: integer("sort_order").notNull(),
}, (table) => [unique().on(table.animeId, table.personId, table.role)]);

export const castCreditsTable = sqliteTable("cast_credits", {
  id: text("id").primaryKey(),
  animeId: text("anime_id").notNull(),
  characterId: text("character_id").notNull(),
  personId: text("person_id").notNull(),
  sortOrder: integer("sort_order").notNull(),
}, (table) => [unique().on(table.animeId, table.characterId, table.personId)]);

export const broadcastSlotsTable = sqliteTable("broadcast_slots", {
  id: text("id").primaryKey(),
  animeId: text("anime_id").notNull(),
  label: text("label").notNull(),
  weekday: integer("weekday").notNull(),
  localTime: text("local_time").notNull(),
  timezone: text("timezone").notNull(),
  platformUrl: text("platform_url"),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull(),
});

export const researchSourcesTable = sqliteTable("research_sources", {
  id: text("id").primaryKey(),
  animeId: text("anime_id"),
  accountId: text("account_id"),
  sourceType: text("source_type", { enum: ["official_page", "official_json", "rss", "bangumi", "youtube", "bluesky", "mastodon", "community", "social"] }).notNull(),
  changeKind: text("change_kind", { enum: ["catalog_metadata", "feed_candidate"] }).notNull(),
  label: text("label").notNull(),
  url: text("url").notNull().unique(),
  itemUrlTemplate: text("item_url_template"),
  trustLevel: text("trust_level", { enum: ["official", "verified_creator", "community", "unverified"] }).notNull(),
  pollIntervalMin: integer("poll_interval_min").notNull(),
  cadenceProfile: text("cadence_profile", { enum: ["rapid", "standard", "local"] }).notNull(),
  urgencyUntil: text("urgency_until"),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  nextCheckAt: text("next_check_at"),
  lastCheckedAt: text("last_checked_at"),
  etag: text("etag"),
  lastModified: text("last_modified"),
  cursor: text("cursor"),
  failureCount: integer("failure_count").notNull(),
  lastError: text("last_error"),
  leaseUntil: text("lease_until"),
});

export const seasonsTable = sqliteTable("seasons", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on").notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
});
