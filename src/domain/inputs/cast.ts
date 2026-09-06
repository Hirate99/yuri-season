import { z } from "zod";

import {
  ianaTimezone,
  integerBetween,
  nullableHttpUrl,
  nullableIntegerBetween,
  nullableText,
  optionalNullableText,
  requiredText,
} from "./schema";

function validBirthday(month: number, day: number): boolean {
  return z.iso
    .date()
    .safeParse(`2024-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`).success;
}

export const castSchema = z
  .object({
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
  })
  .superRefine((value, context) => {
    if ((value.birthdayMonth === null) !== (value.birthdayDay === null)) {
      context.addIssue({ code: "custom", message: "角色生日的月、日需要同时填写。" });
    }

    if (
      value.birthdayMonth !== null &&
      value.birthdayDay !== null &&
      !validBirthday(value.birthdayMonth, value.birthdayDay)
    ) {
      context.addIssue({ code: "custom", message: "角色生日日期不成立。" });
    }

    if (
      value.birthdayVerified &&
      (value.birthdayMonth === null || value.birthdayDay === null || !value.birthdaySourceUrl)
    ) {
      context.addIssue({ code: "custom", message: "已验证生日必须提供月、日与明确来源。" });
    }

    if (value.portraitUrl && !value.portraitSourceUrl) {
      context.addIssue({ code: "custom", message: "角色头像必须提供来源链接。" });
    }
  });
