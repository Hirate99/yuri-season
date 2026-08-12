import type { Context } from "hono";
import type { Hono } from "hono";

import { readThroughPublicCache } from "@worker/cache/public-cache";
import { HttpError } from "@worker/http";

export type ApiEnvironment = { Bindings: Env };
export type ApiContext = Context<ApiEnvironment>;
export type ApiApp = Hono<ApiEnvironment>;

const PUBLIC_CACHE = "public, max-age=30, stale-while-revalidate=120";
const JSON_CONTENT_TYPE = /^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i;

export async function jsonInput<T>(context: ApiContext, parse: (input: unknown) => T): Promise<T> {
  if (!JSON_CONTENT_TYPE.test(context.req.header("content-type") ?? "")) {
    throw new HttpError(415, "请求需要使用 JSON。");
  }
  try {
    return parse(await context.req.json());
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "请求内容不是有效的 UTF-8 JSON。");
  }
}

export function publicJson(context: ApiContext, data: object): Response {
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
): Promise<Response> {
  const data = await cachedPublicData(context, key, ttlSeconds, load);
  return publicJson(context, data);
}
