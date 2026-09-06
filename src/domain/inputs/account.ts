import { z } from "zod";

import { httpUrl, nullableHttpUrl, nullableText, requiredText } from "./schema";

export const accountSchema = z
  .object({
    ownerType: z.enum(["anime", "person", "organization"], "ownerType 格式不正确。"),
    ownerId: requiredText(120, "ownerId"),
    platform: requiredText(80, "platform"),
    handle: nullableText(160, "handle").default(null),
    url: httpUrl("url"),
    verified: z.boolean("verified 必须是布尔值。"),
    monitorMode: z.enum(["api", "rss", "page", "local", "disabled"], "monitorMode 格式不正确。"),
    verificationSourceUrl: nullableHttpUrl("verificationSourceUrl").default(null),
  })
  .refine((value) => !value.verified || Boolean(value.verificationSourceUrl), {
    message: "已验证账号必须提供一手验证链接。",
    path: ["verificationSourceUrl"],
  });
