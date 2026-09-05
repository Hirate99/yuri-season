import { z } from "zod";

import {
  ianaTimezone,
  integerBetween,
  nullableHttpUrl,
  requiredText
} from "./schema";

export const broadcastSchema = z.object({
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
