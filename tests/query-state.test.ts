import { worksQuery, resourcesQuery } from "@/features/admin/queries";
import { afterEach, expect, test } from "bun:test";
import { dehydrate, hydrate, InfiniteQueryObserver, QueryObserver } from "@tanstack/react-query";
import { createQueryClient, feedOptions } from "@/lib/queries";
import type { ServerRequestContext } from "@/server-context";

const originalFetch = globalThis.fetch;
const clients: ReturnType<typeof createQueryClient>[] = [];
const client = () => { const value = createQueryClient(); clients.push(value); return value; };
afterEach(() => { globalThis.fetch = originalFetch; clients.splice(0).forEach(value => value.clear()); });

test("Feed hydration avoids a duplicate fetch and caches subsequent cursor pages", async () => {
  const cursors: Array<string | null> = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    const cursor = new URL(String(url)).searchParams.get("cursor");
    cursors.push(cursor);
    return Response.json({ items: [], nextCursor: cursor ? null : "page-two" });
  }) as unknown as typeof fetch;
  const options = feedOptions({ category: "official", q: "夏季" }, {
    serverContext: { publicApiOrigin: "https://query.test" } as ServerRequestContext,
  });
  const server = client();
  await server.ensureInfiniteQueryData(options);
  const browser = client();
  hydrate(browser, dehydrate(server));
  const observer = new InfiniteQueryObserver(browser, options);
  const unsubscribe = observer.subscribe(() => {});
  try {
    expect(cursors).toEqual([null]); // No duplicate request on hydration.
    await observer.fetchNextPage();
    const restored = await browser.ensureInfiniteQueryData(options);
    expect(restored.pageParams).toEqual([undefined, "page-two"]);
    expect(restored.pages).toHaveLength(2);
    expect(cursors).toEqual([null, "page-two"]);
    expect(observer.getCurrentResult().hasNextPage).toBe(false);
    expect(client().getQueryData(options.queryKey)).toBeUndefined();
    expect(feedOptions({ category: "cast" }).queryKey).not.toEqual(options.queryKey);
  } finally { unsubscribe(); }
});

test("Admin invalidation retains data after refresh failure and permits an explicit refetch", async () => {
  let fail = false;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests++;
    return fail ? Response.json({ message: "暂时不可用" }, { status: 503 }) : Response.json({ cast: [] });
  }) as unknown as typeof fetch;
  const cache = client();
  const options = resourcesQuery("anime-taiari");
  const saved = await cache.fetchQuery(options);
  const observer = new QueryObserver(cache, options);
  const unsubscribe = observer.subscribe(() => {});
  fail = true;
  await cache.invalidateQueries({ queryKey: ["admin"] });
  expect(observer.getCurrentResult().data).toEqual(saved);
  expect(observer.getCurrentResult().error?.message).toBe("暂时不可用");
  expect(requests).toBe(2); // No automatic retry loop.
  unsubscribe();
  fail = false;
  await cache.fetchQuery(options);
  expect(requests).toBe(3);
});

test("canceling an Admin query aborts its RPC request", async () => {
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = ((_url: unknown, init?: RequestInit) => {
    signal = init?.signal;
    return new Promise<Response>((_resolve, reject) => signal?.addEventListener("abort", () => reject(signal?.reason)));
  }) as unknown as typeof fetch;
  const cache = client();
  const options = worksQuery;
  const pending = cache.fetchQuery(options).catch(() => undefined);
  await cache.cancelQueries({ queryKey: options.queryKey });
  await pending;
  expect(signal?.aborted).toBe(true);
  expect(cache.getQueryData(options.queryKey)).toBeUndefined();
});
