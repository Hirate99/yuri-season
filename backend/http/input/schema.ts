import { z } from "zod";
import { HttpError } from "~/shared/http-error";
export * from "@/domain/inputs/schema";

export function parseWithSchema<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "请求内容格式不正确。");
  }
  return result.data;
}
