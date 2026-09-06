import { z } from "zod";

import { httpUrl, nullableText, requiredText, temporal } from "./schema";

export const discussionSchema = z.object({
  platform: requiredText(80, "platform"),
  title: requiredText(300, "title"),
  url: httpUrl("url"),
  note: nullableText(1_000, "note").default(null),
  isActive: z.boolean("isActive 必须是布尔值。"),
  animeIds: z
    .array(requiredText(120, "animeIds"))
    .max(100, "讨论串最多关联 100 部作品。")
    .default([]),
  lastActivityAt: temporal("lastActivityAt").default(null),
});
