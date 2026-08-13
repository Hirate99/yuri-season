import { z } from "zod";

import type { DiscussionWrite, EventWrite, MediaWrite, ThemeSongWrite } from "@/domain";
import {
  httpUrl,
  ianaTimezone,
  integerBetween,
  nullableHttpUrl,
  nullableText,
  offsetDateTime,
  parseWithSchema,
  requiredText,
  temporal,
} from "./schema";

const eventSchema = z.object({
  personId: nullableText(120, "personId").default(null),
  characterId: nullableText(120, "characterId").default(null),
  eventType: z.enum(["broadcast", "anniversary", "stream", "radio", "event", "release"], "eventType 格式不正确。"),
  title: requiredText(240, "title"),
  startsAt: temporal("startsAt").default(null),
  endsAt: temporal("endsAt").default(null),
  timezone: ianaTimezone("timezone"),
  recurrenceRule: nullableText(300, "recurrenceRule")
    .refine(
      (value) => value === null || /^FREQ=(YEARLY|MONTHLY|WEEKLY|DAILY)(;[A-Z]+=[A-Z0-9,+-]+)*$/.test(value),
      "recurrenceRule 不是支持的 RRULE。",
    )
    .default(null),
  sourceUrl: nullableHttpUrl("sourceUrl").default(null),
  verified: z.boolean("verified 必须是布尔值。"),
  status: z.enum(["scheduled", "completed", "cancelled"], "status 格式不正确。"),
}).superRefine((value, context) => {
  if (value.verified && (!value.startsAt || !value.sourceUrl)) {
    context.addIssue({ code: "custom", message: "已验证事件必须有时间和原始来源。" });
  }
  if (value.startsAt && value.endsAt && Date.parse(value.endsAt) < Date.parse(value.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "结束时间不能早于开始时间。" });
  }
});

const mediaSchema = z.object({
  personId: nullableText(120, "personId").default(null),
  characterId: nullableText(120, "characterId").default(null),
  contentClass: z.enum(["official_art", "creator_art", "fanart", "fan_video", "cosplay"], "contentClass 格式不正确。"),
  title: requiredText(240, "title"),
  creatorName: requiredText(200, "creatorName"),
  creatorUrl: nullableHttpUrl("creatorUrl").default(null),
  originalUrl: httpUrl("originalUrl"),
  previewUrl: nullableHttpUrl("previewUrl").default(null),
  presentationMode: z.enum(["link_only", "platform_embed", "remote_preview", "mirrored_with_permission"], "presentationMode 格式不正确。"),
  safetyRating: z.enum(["safe", "suggestive", "adult", "unknown"], "safetyRating 格式不正确。"),
  spoilerLevel: z.enum(["none", "mild", "major"], "spoilerLevel 格式不正确。"),
  rightsNote: nullableText(1_000, "rightsNote").default(null),
  publishedAt: offsetDateTime("publishedAt"),
}).superRefine((value, context) => {
  if (value.presentationMode === "remote_preview" && !value.previewUrl) {
    context.addIssue({ code: "custom", path: ["previewUrl"], message: "远程预览必须提供 previewUrl。" });
  }
  if (value.presentationMode === "mirrored_with_permission" && (!value.previewUrl || !value.rightsNote)) {
    context.addIssue({ code: "custom", message: "获授权镜像必须提供预览地址和授权说明。" });
  }
});

const discussionSchema = z.object({
  platform: requiredText(80, "platform"),
  title: requiredText(300, "title"),
  url: httpUrl("url"),
  note: nullableText(1_000, "note").default(null),
  isActive: z.boolean("isActive 必须是布尔值。"),
  animeIds: z.array(requiredText(120, "animeIds")).max(100, "讨论串最多关联 100 部作品。").default([]),
  lastActivityAt: temporal("lastActivityAt").default(null),
});

const themeSongSchema = z.object({
  trackId: nullableText(120, "trackId").default(null),
  songKind: z.enum(["opening", "ending", "theme", "insert", "image"], "songKind 格式不正确。"),
  sequence: integerBetween(1, 99, "sequence"),
  title: requiredText(300, "title"),
  artist: requiredText(300, "artist"),
  lyricist: nullableText(300, "lyricist").default(null),
  composer: nullableText(300, "composer").default(null),
  arranger: nullableText(300, "arranger").default(null),
  episodeRange: nullableText(120, "episodeRange").default(null),
  officialUrl: nullableHttpUrl("officialUrl").default(null),
  coverUrl: nullableHttpUrl("coverUrl").default(null),
  coverSourceUrl: nullableHttpUrl("coverSourceUrl").default(null),
  sourceUrl: nullableHttpUrl("sourceUrl").default(null),
  verified: z.boolean("verified 必须是布尔值。"),
  sortOrder: integerBetween(0, 10_000, "sortOrder"),
}).superRefine((value, context) => {
  if (value.verified && !value.sourceUrl) {
    context.addIssue({ code: "custom", path: ["sourceUrl"], message: "已验证主题曲必须提供官方资料来源。" });
  }
  if (value.coverUrl && !value.coverSourceUrl) {
    context.addIssue({ code: "custom", path: ["coverSourceUrl"], message: "主题曲封面必须保留图片来源。" });
  }
});

export function parseEvent(input: unknown): EventWrite {
  return parseWithSchema(eventSchema, input);
}

export function parseMedia(input: unknown): MediaWrite {
  return parseWithSchema(mediaSchema, input);
}

export function parseDiscussion(input: unknown): DiscussionWrite {
  return parseWithSchema(discussionSchema, input);
}

export function parseThemeSong(input: unknown): ThemeSongWrite {
  return parseWithSchema(themeSongSchema, input);
}
