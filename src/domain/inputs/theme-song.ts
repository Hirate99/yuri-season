import { z } from "zod";

import { integerBetween, nullableHttpUrl, nullableText, requiredText } from "./schema";

export const themeSongSchema = z
  .object({
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
  })
  .superRefine((value, context) => {
    if (value.verified && !value.sourceUrl) {
      context.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "已验证主题曲必须提供官方资料来源。",
      });
    }

    if (value.coverUrl && !value.coverSourceUrl) {
      context.addIssue({
        code: "custom",
        path: ["coverSourceUrl"],
        message: "主题曲封面必须保留图片来源。",
      });
    }
  });
