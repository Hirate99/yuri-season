import { describe, expect, test } from "bun:test";

import {
  invalidatePublicCache,
  readThroughPublicCache,
  type PublicCacheClient,
} from "~/infrastructure/cache/public-cache";

const noRedis = {
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
};

class MemoryCache implements PublicCacheClient {
  readonly values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  async set(key: string, value: unknown): Promise<string> {
    this.values.set(key, value);
    return "OK";
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.values.get(key) ?? 0) + 1;
    this.values.set(key, next);
    return next;
  }
}

describe("public Redis cache", () => {
  test("falls back to the loader when Redis is not configured", async () => {
    let loads = 0;
    const load = async () => ({ value: ++loads });
    expect(await readThroughPublicCache(noRedis, "catalog", load)).toEqual({ value: 1 });
    expect(await readThroughPublicCache(noRedis, "catalog", load)).toEqual({ value: 2 });
  });

  test("reuses a cached read and reloads it after version invalidation", async () => {
    const client = new MemoryCache();
    let loads = 0;
    const load = async () => ({ value: ++loads });

    expect(await readThroughPublicCache(noRedis, "catalog", load, { client })).toEqual({ value: 1 });
    expect(await readThroughPublicCache(noRedis, "catalog", load, { client })).toEqual({ value: 1 });
    await invalidatePublicCache(noRedis, client);
    expect(await readThroughPublicCache(noRedis, "catalog", load, { client })).toEqual({ value: 2 });
  });

  test("keeps the D1 path healthy when Redis reads fail", async () => {
    const client = new MemoryCache();
    client.get = async () => { throw new Error("redis unavailable"); };
    await expect(readThroughPublicCache(noRedis, "catalog", async () => ({ ok: true }), { client }))
      .resolves.toEqual({ ok: true });
  });
});
