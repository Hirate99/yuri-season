import { z } from "zod";

import {
  integerBetween,
  nullableHttpUrl,
  nullableText,
  optionalNullableText,
  requiredText,
} from "./schema";

export const staffSchema = z.object({
  personId: optionalNullableText(120, "personId"),
  name: requiredText(200, "name"),
  nameNative: nullableText(200, "nameNative").default(null),
  primaryKind: z.enum(
    ["author", "staff", "cast", "artist", "organization"],
    "primaryKind 格式不正确。",
  ),
  role: requiredText(200, "role"),
  profileUrl: nullableHttpUrl("profileUrl").default(null),
  sortOrder: integerBetween(0, 10_000, "sortOrder"),
});
