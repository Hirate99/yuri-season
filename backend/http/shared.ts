import type { Context, MiddlewareHandler } from "hono";
import { validator } from "hono/validator";
import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";

import type { RequestServices } from "~/application/services";
import { HttpError } from "~/shared/http-error";

export type ApiEnvironment = { Bindings: Env; Variables: { services: RequestServices } };
export type ApiContext = Context<ApiEnvironment>;

const PUBLIC_CACHE = "public, max-age=15, stale-while-revalidate=45";
const JSON_CONTENT_TYPE = /^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i;

type ValidatedInput<Target extends "json" | "query", Input, Output> = {
  in: { [Key in Target]: Input };
  out: { [Key in Target]: Output };
};

export function validatedJson<Input, Output = Input>(parse: (input: unknown, context: ApiContext) => Output) {
  return validator("json", (input, context: ApiContext) => {
    if (!JSON_CONTENT_TYPE.test(context.req.header("content-type") ?? "")) {
      throw new HttpError(415, "请求需要使用 JSON。");
    }
    return parse(input, context);
  }) as MiddlewareHandler<ApiEnvironment, string, ValidatedInput<"json", Input, Output>>;
}

export function validate<Target extends "json" | "query", Schema extends z.ZodType>(target: Target, schema: Schema) {
  return zValidator(target, schema, (result, context) => {
    if (target === "json" && !JSON_CONTENT_TYPE.test(context.req.header("content-type") ?? "")) {
      throw new HttpError(415, "请求需要使用 JSON。");
    }
    if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? "请求内容格式不正确。");
  });
}

export function publicJson<T extends object>(context: ApiContext, data: T) {
  context.header("cache-control", PUBLIC_CACHE);
  return context.json(data);
}
