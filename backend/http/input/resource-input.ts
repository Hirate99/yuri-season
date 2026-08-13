import { z } from "zod";

import type {
  AccountWrite,
  AdminResourceKind,
  AdminResourceWrite,
  BroadcastWrite,
  CastWrite,
  SourceWrite,
  StaffWrite,
} from "@/domain";
import { HttpError } from "~/shared/http-error";
import { parseDiscussion, parseEvent, parseMedia, parseThemeSong } from "./resource-content-input";
import {
  httpUrl,
  ianaTimezone,
  integerBetween,
  nullableHttpUrl,
  nullableIntegerBetween,
  nullableText,
  optionalNullableText,
  parseWithSchema,
  requiredText,
} from "./schema";

const resourceKindSchema = z.enum([
  "broadcast", "account", "staff", "cast", "source", "event", "media", "discussion", "theme_song",
]);

const broadcastSchema = z.object({
  label: requiredText(200, "label"),
  weekday: integerBetween(0, 6, "weekday"),
  localTime: requiredText(5, "localTime").regex(
    /^(?:[0-3]?\d|4[0-7]):[0-5]\d$/,
    "localTime 需要使用 HH:mm，可保留 24:30 等公式写法。",
  ),
  timezone: ianaTimezone("timezone"),
  platformUrl: nullableHttpUrl("platformUrl").default(null),
  isPrimary: z.boolean("isPrimary 必须是布尔值。"),
});

const accountSchema = z.object({
  ownerType: z.enum(["anime", "person", "organization"], "ownerType 格式不正确。"),
  ownerId: requiredText(120, "ownerId"),
  platform: requiredText(80, "platform"),
  handle: nullableText(160, "handle").default(null),
  url: httpUrl("url"),
  verified: z.boolean("verified 必须是布尔值。"),
  monitorMode: z.enum(["api", "rss", "page", "local", "disabled"], "monitorMode 格式不正确。"),
  verificationSourceUrl: nullableHttpUrl("verificationSourceUrl").default(null),
}).refine((value) => !value.verified || Boolean(value.verificationSourceUrl), {
  message: "已验证账号必须提供一手验证链接。",
  path: ["verificationSourceUrl"],
});

const staffSchema = z.object({
  personId: optionalNullableText(120, "personId"),
  name: requiredText(200, "name"),
  nameNative: nullableText(200, "nameNative").default(null),
  primaryKind: z.enum(["author", "staff", "cast", "artist", "organization"], "primaryKind 格式不正确。"),
  role: requiredText(200, "role"),
  profileUrl: nullableHttpUrl("profileUrl").default(null),
  sortOrder: integerBetween(0, 10_000, "sortOrder"),
});

function validBirthday(month: number, day: number): boolean {
  return z.iso.date().safeParse(`2024-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`).success;
}

const castSchema = z.object({
  personId: optionalNullableText(120, "personId"),
  characterName: requiredText(200, "characterName"),
  characterNameNative: nullableText(200, "characterNameNative").default(null),
  nameSourceUrl: nullableHttpUrl("nameSourceUrl").default(null),
  characterProfile: nullableText(4_000, "characterProfile").default(null),
  profileSourceUrl: nullableHttpUrl("profileSourceUrl").default(null),
  portraitUrl: nullableHttpUrl("portraitUrl").default(null),
  portraitSourceUrl: nullableHttpUrl("portraitSourceUrl").default(null),
  isMainGroup: z.boolean("isMainGroup 必须是布尔值。").default(true),
  personName: requiredText(200, "personName"),
  personNameNative: nullableText(200, "personNameNative").default(null),
  birthdayMonth: nullableIntegerBetween(1, 12, "birthdayMonth").default(null),
  birthdayDay: nullableIntegerBetween(1, 31, "birthdayDay").default(null),
  birthdayYear: nullableIntegerBetween(1800, 3000, "birthdayYear").default(null),
  birthdayTimezone: ianaTimezone("birthdayTimezone"),
  birthdaySourceUrl: nullableHttpUrl("birthdaySourceUrl").default(null),
  birthdayVerified: z.boolean("birthdayVerified 必须是布尔值。"),
  sortOrder: integerBetween(0, 10_000, "sortOrder"),
}).superRefine((value, context) => {
  if ((value.birthdayMonth === null) !== (value.birthdayDay === null)) {
    context.addIssue({ code: "custom", message: "角色生日的月、日需要同时填写。" });
  }
  if (value.birthdayMonth !== null && value.birthdayDay !== null && !validBirthday(value.birthdayMonth, value.birthdayDay)) {
    context.addIssue({ code: "custom", message: "角色生日日期不成立。" });
  }
  if (value.birthdayVerified && (value.birthdayMonth === null || value.birthdayDay === null || !value.birthdaySourceUrl)) {
    context.addIssue({ code: "custom", message: "已验证生日必须提供月、日与明确来源。" });
  }
  if (value.portraitUrl && !value.portraitSourceUrl) {
    context.addIssue({ code: "custom", message: "角色头像必须提供来源链接。" });
  }
});

const itemUrlTemplate = nullableText(2_000, "itemUrlTemplate").refine((value) => {
  if (value === null) return true;
  try {
    const url = new URL(value.replaceAll("{id}", "1"));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "itemUrlTemplate 只支持有效的 HTTP(S) 链接。");

const sourceSchema = z.object({
  accountId: nullableText(120, "accountId").default(null),
  sourceType: z.enum(["official_page", "official_json", "rss", "bangumi", "youtube", "bluesky", "mastodon", "community", "social"], "sourceType 格式不正确。"),
  changeKind: z.enum(["catalog_metadata", "feed_candidate"], "changeKind 格式不正确。"),
  label: requiredText(200, "label"),
  url: httpUrl("url"),
  itemUrlTemplate: itemUrlTemplate.default(null),
  trustLevel: z.enum(["official", "verified_creator", "community", "unverified"], "trustLevel 格式不正确。"),
  pollIntervalMin: integerBetween(30, 43_200, "pollIntervalMin"),
  cadenceProfile: z.enum(["rapid", "standard", "local"], "cadenceProfile 格式不正确。"),
  enabled: z.boolean("enabled 必须是布尔值。"),
});

export function parseResourceKind(value: string): AdminResourceKind {
  const result = resourceKindSchema.safeParse(value);
  if (!result.success) throw new HttpError(404, "未知的资源类型。");
  return result.data;
}

export function parseResourceWrite(kind: string, input: unknown): AdminResourceWrite {
  switch (parseResourceKind(kind)) {
    case "broadcast": return { kind: "broadcast", value: parseWithSchema(broadcastSchema, input) as BroadcastWrite };
    case "account": return { kind: "account", value: parseWithSchema(accountSchema, input) as AccountWrite };
    case "staff": return { kind: "staff", value: parseWithSchema(staffSchema, input) as StaffWrite };
    case "cast": return { kind: "cast", value: parseWithSchema(castSchema, input) as CastWrite };
    case "source": return { kind: "source", value: parseWithSchema(sourceSchema, input) as SourceWrite };
    case "event": return { kind: "event", value: parseEvent(input) };
    case "media": return { kind: "media", value: parseMedia(input) };
    case "discussion": return { kind: "discussion", value: parseDiscussion(input) };
    case "theme_song": return { kind: "theme_song", value: parseThemeSong(input) };
  }
}

const resourceEnvelopeSchema = z.object({
  kind: resourceKindSchema,
  value: z.record(z.string(), z.unknown()),
});

export function parseResourceEnvelope(input: unknown): AdminResourceWrite {
  const envelope = parseWithSchema(resourceEnvelopeSchema, input);
  return parseResourceWrite(envelope.kind, envelope.value);
}
