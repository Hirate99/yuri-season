import { HTTPException } from "hono/http-exception";
import { decodeBase64Url, encodeBase64Url } from "hono/utils/encode";
import { z } from "zod";

const cursorSchema = z
  .object({
    createdAt: z
      .string()
      .min(1)
      .max(80)
      .refine((value) => Number.isFinite(Date.parse(value))),
    id: z.string().min(1).max(160),
  })
  .strict();

export type SubscriptionCursor = z.infer<typeof cursorSchema>;

export function encodeSubscriptionCursor(cursor: SubscriptionCursor): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(cursor)).buffer);
}

export function decodeSubscriptionCursor(value: string): SubscriptionCursor {
  try {
    if (!value || value.length > 1024 || !/^[\w-]+={0,2}$/.test(value)) throw new Error();
    return cursorSchema.parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decodeBase64Url(value))),
    );
  } catch {
    throw new HTTPException(400, { message: "订阅分页参数无效。" });
  }
}
