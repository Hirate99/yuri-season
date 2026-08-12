import { z } from "zod";

import type { SeasonWrite } from "@/domain";
import { dateOnly, parseWithSchema, requiredText } from "./schema";

const seasonSchema = z.object({
  slug: requiredText(40, "slug").regex(/^\d{4}-(winter|spring|summer|autumn)$/, "slug 需要使用 2026-summer 形式。"),
  label: requiredText(80, "label"),
  startsOn: dateOnly("startsOn"),
  endsOn: dateOnly("endsOn"),
  isCurrent: z.boolean("isCurrent 必须是布尔值。"),
}).refine((value) => value.startsOn <= value.endsOn, {
  message: "季度结束日期不能早于开始日期。",
  path: ["endsOn"],
});

export function parseSeasonWrite(input: unknown): SeasonWrite {
  return parseWithSchema(seasonSchema, input);
}
