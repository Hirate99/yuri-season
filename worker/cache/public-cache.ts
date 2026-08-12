import { Redis } from "@upstash/redis";

const CACHE_NAMESPACE = "yuri:public:v1";
const CACHE_VERSION_KEY = `${CACHE_NAMESPACE}:version`;

type RedisEnvironment = {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
};

export type PublicCacheClient = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options: { ex: number }): Promise<unknown>;
  incr(key: string): Promise<number>;
};

type CacheOptions = {
  client?: PublicCacheClient | null;
  ttlSeconds?: number;
};

function redisClient(env: object): PublicCacheClient | null {
  const redisEnv = env as RedisEnvironment;
  if (!redisEnv.UPSTASH_REDIS_REST_URL || !redisEnv.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: redisEnv.UPSTASH_REDIS_REST_URL,
    token: redisEnv.UPSTASH_REDIS_REST_TOKEN,
  });
}

function resolveClient(env: object, options: CacheOptions): PublicCacheClient | null {
  return Object.hasOwn(options, "client") ? options.client ?? null : redisClient(env);
}

/**
 * Reads public data through an optional Redis cache. Redis is deliberately
 * best-effort: a missing configuration or cache outage always falls back to D1.
 */
export async function readThroughPublicCache<T>(
  env: object,
  key: string,
  load: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const client = resolveClient(env, options);
  if (!client) return load();

  let cacheKey: string;
  try {
    const version = await client.get<number | string>(CACHE_VERSION_KEY);
    cacheKey = `${CACHE_NAMESPACE}:${version ?? 0}:${key}`;
    const cached = await client.get<T>(cacheKey);
    if (cached !== null) return cached;
  } catch {
    return load();
  }

  const value = await load();
  try {
    await client.set(cacheKey, value, { ex: options.ttlSeconds ?? 300 });
  } catch {
    // Cache writes must never turn a healthy D1 response into an API failure.
  }
  return value;
}

/**
 * Invalidates every public read model by advancing its cache namespace.
 * Existing keys expire naturally, so invalidation never needs a wildcard scan.
 */
export async function invalidatePublicCache(
  env: object,
  options: Pick<CacheOptions, "client"> = {},
): Promise<void> {
  const client = resolveClient(env, options);
  if (!client) return;
  try {
    await client.incr(CACHE_VERSION_KEY);
  } catch {
    // D1 is the source of truth; the TTL bounds staleness when Redis is down.
  }
}
