import { z } from "zod";

import { ianaTimezone, nullableHttpUrl, nullableText, requiredText, temporal } from "./schema";

export const eventSchema = z
  .object({
    personId: nullableText(120, "personId").default(null),
    characterId: nullableText(120, "characterId").default(null),
    eventType: z.enum(
      ["broadcast", "anniversary", "stream", "radio", "event", "release"],
      "eventType 格式不正确。",
    ),
    title: requiredText(240, "title"),
    startsAt: temporal("startsAt").default(null),
    endsAt: temporal("endsAt").default(null),
    timezone: ianaTimezone("timezone"),
    recurrenceRule: nullableText(300, "recurrenceRule")
      .refine(
        (value) =>
          value === null ||
          /^FREQ=(YEARLY|MONTHLY|WEEKLY|DAILY)(;[A-Z]+=[A-Z0-9,+-]+)*$/.test(value),
        "recurrenceRule 不是支持的 RRULE。",
      )
      .default(null),
    sourceUrl: nullableHttpUrl("sourceUrl").default(null),
    verified: z.boolean("verified 必须是布尔值。"),
    status: z.enum(["scheduled", "completed", "cancelled"], "status 格式不正确。"),
  })
  .superRefine((value, context) => {
    if (value.verified && (!value.startsAt || !value.sourceUrl)) {
      context.addIssue({ code: "custom", message: "已验证事件必须有时间和原始来源。" });
    }

    if (value.startsAt && value.endsAt && Date.parse(value.endsAt) < Date.parse(value.startsAt)) {
      context.addIssue({ code: "custom", path: ["endsAt"], message: "结束时间不能早于开始时间。" });
    }
  });
