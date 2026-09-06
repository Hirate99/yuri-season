import { z } from "zod";

import { httpUrl, integerBetween, nullableText, requiredText } from "./schema";

const itemUrlTemplate = nullableText(2_000, "itemUrlTemplate").refine((value) => {
  if (value === null) return true;

  try {
    const url = new URL(value.replaceAll("{id}", "1"));

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "itemUrlTemplate 只支持有效的 HTTP(S) 链接。");

export const sourceSchema = z
  .object({
    accountId: nullableText(120, "accountId").default(null),
    sourceType: z.enum(
      [
        "official_page",
        "official_json",
        "rss",
        "bangumi",
        "youtube",
        "bluesky",
        "mastodon",
        "community",
        "social",
      ],
      "sourceType 格式不正确。",
    ),
    changeKind: z.enum(["catalog_metadata", "feed_candidate"], "changeKind 格式不正确。"),
    label: requiredText(200, "label"),
    url: httpUrl("url"),
    itemUrlTemplate: itemUrlTemplate.default(null),
    trustLevel: z.enum(
      ["official", "verified_creator", "community", "unverified"],
      "trustLevel 格式不正确。",
    ),
    publicTextMode: z
      .enum(["full", "full_with_translation", "excerpt", "summary_only", "link_only"])
      .optional(),
    maxPublicCharacters: integerBetween(0, 24_000, "maxPublicCharacters").optional(),
    pollIntervalMin: integerBetween(30, 43_200, "pollIntervalMin"),
    cadenceProfile: z.enum(["rapid", "standard", "local"], "cadenceProfile 格式不正确。"),
    enabled: z.boolean("enabled 必须是布尔值。"),
  })
  .transform((value) => {
    const trusted = value.trustLevel === "official" || value.trustLevel === "verified_creator";

    return {
      ...value,
      publicTextMode:
        value.publicTextMode ??
        (trusted
          ? "full_with_translation"
          : value.trustLevel === "community"
            ? "summary_only"
            : "link_only"),
      maxPublicCharacters:
        value.maxPublicCharacters ??
        (value.trustLevel === "official"
          ? 24_000
          : value.trustLevel === "verified_creator"
            ? 6_000
            : value.trustLevel === "community"
              ? 800
              : 0),
    };
  });
