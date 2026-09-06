import { z } from "zod";

import { httpUrl, nullableHttpUrl, nullableText, offsetDateTime, requiredText } from "./schema";

export const mediaSchema = z
  .object({
    personId: nullableText(120, "personId").default(null),
    characterId: nullableText(120, "characterId").default(null),
    contentClass: z.enum(
      ["official_art", "creator_art", "fanart", "fan_video", "cosplay"],
      "contentClass 格式不正确。",
    ),
    title: requiredText(240, "title"),
    creatorName: requiredText(200, "creatorName"),
    creatorUrl: nullableHttpUrl("creatorUrl").default(null),
    originalUrl: httpUrl("originalUrl"),
    previewUrl: nullableHttpUrl("previewUrl").default(null),
    presentationMode: z.enum(
      ["link_only", "platform_embed", "remote_preview", "mirrored_with_permission"],
      "presentationMode 格式不正确。",
    ),
    safetyRating: z.enum(["safe", "suggestive", "adult", "unknown"], "safetyRating 格式不正确。"),
    spoilerLevel: z.enum(["none", "mild", "major"], "spoilerLevel 格式不正确。"),
    rightsNote: nullableText(1_000, "rightsNote").default(null),
    publishedAt: offsetDateTime("publishedAt"),
  })
  .superRefine((value, context) => {
    if (value.presentationMode === "remote_preview" && !value.previewUrl) {
      context.addIssue({
        code: "custom",
        path: ["previewUrl"],
        message: "远程预览必须提供 previewUrl。",
      });
    }

    if (
      value.presentationMode === "mirrored_with_permission" &&
      (!value.previewUrl || !value.rightsNote)
    ) {
      context.addIssue({ code: "custom", message: "获授权镜像必须提供预览地址和授权说明。" });
    }
  });
