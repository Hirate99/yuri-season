import { z } from "zod";

import { HttpError } from "~/shared/http-error";

export function parseWithSchema<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "请求内容格式不正确。");
  }
  return result.data;
}

export function requiredText(maximum: number, label: string) {
  return z.string(`${label} 必须是字符串。`).max(maximum, `${label} 过长。`).trim().min(1, `${label} 不能为空。`);
}

export function nullableText(maximum: number, label: string) {
  return z.preprocess(
    (value) => value === "" ? null : value,
    z.string(`${label} 必须是字符串。`).max(maximum, `${label} 过长。`).trim().nullable(),
  );
}

export function optionalNullableText(maximum: number, label: string) {
  return nullableText(maximum, label).optional();
}

export function integerBetween(minimum: number, maximum: number, label: string) {
  const message = `${label} 需要是 ${minimum}–${maximum} 的整数。`;
  return z.number(message).int(message).min(minimum, message).max(maximum, message);
}

export function numberBetween(minimum: number, maximum: number, label: string) {
  return z.number(`${label} 必须是数字。`).finite(`${label} 必须是有限数字。`).min(minimum).max(maximum);
}

export function nullableIntegerBetween(minimum: number, maximum: number, label: string) {
  return z.preprocess(
    (value) => value === "" ? null : value,
    integerBetween(minimum, maximum, label).nullable(),
  );
}

export function httpUrl(label: string) {
  return requiredText(2_000, label).pipe(z.url({
    protocol: /^https?$/,
    normalize: true,
    error: `${label} 只支持 HTTP(S) 链接。`,
  }));
}

export function nullableHttpUrl(label: string) {
  return z.preprocess(
    (value) => value === "" ? null : value,
    httpUrl(label).nullable(),
  );
}

export function optionalNullableHttpUrl(label: string) {
  return nullableHttpUrl(label).optional();
}

export function ianaTimezone(label: string) {
  return requiredText(100, label).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, `${label} 不是有效 IANA 时区。`);
}

export function dateOnly(label: string) {
  return requiredText(10, label).pipe(z.iso.date(`${label} 需要使用有效的 YYYY-MM-DD 日期。`));
}

export function offsetDateTime(label: string) {
  return requiredText(80, label).pipe(
    z.iso.datetime({ offset: true, error: `${label} 必须是带明确时区的 ISO 时间。` }),
  );
}

export function temporal(label: string, allowDateOnly = true) {
  const valueSchema = allowDateOnly
    ? z.union([
        z.iso.date(`${label} 必须是有效日期。`),
        z.iso.datetime({ offset: true, error: `${label} 必须是带明确时区的 ISO 时间。` }),
      ])
    : z.iso.datetime({ offset: true, error: `${label} 必须是带明确时区的 ISO 时间。` });
  return z.preprocess(
    (value) => value === "" ? null : value,
    valueSchema.nullable(),
  );
}

export const jsonObject = z.record(z.string(), z.unknown());
