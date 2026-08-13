import type { Context, MiddlewareHandler } from "hono";
import { validator } from "hono/validator";

import type { RequestServices } from "~/application/services";
import { invalidatePublicCache, readThroughPublicCache } from "~/infrastructure/cache/public-cache";
import { HttpError } from "~/shared/http-error";

export type ApiEnvironment = { Bindings: Env; Variables: { services: RequestServices } };
export type ApiContext = Context<ApiEnvironment>;

const PUBLIC_CACHE = "public, max-age=30, stale-while-revalidate=120";
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

export function validatedQuery<Input, Output = Input>(parse: (input: unknown, context: ApiContext) => Output) {
  return validator("query", (input, context: ApiContext) => parse(input, context)) as
    MiddlewareHandler<ApiEnvironment, string, ValidatedInput<"query", Input, Output>>;
}

export function publicJson<T extends object>(context: ApiContext, data: T) {
  context.header("cache-control", PUBLIC_CACHE);
  return context.json(data);
}

export function cachedPublicData<T>(
  context: ApiContext,
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  return readThroughPublicCache(context.env, key, load, { ttlSeconds });
}

export async function cachedPublicJson<T extends object>(
  context: ApiContext,
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
) {
  const data = await cachedPublicData(context, key, ttlSeconds, load);
  return publicJson(context, data);
}

export function invalidatePublicData(context: ApiContext): void {
  context.executionCtx.waitUntil(invalidatePublicCache(context.env));
}
