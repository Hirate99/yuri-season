# Backend architecture

The backend follows four boundaries:

1. `src/server/api-*-routes.ts` owns HTTP concerns only: authentication, input parsing,
   status codes, cache headers, and route registration.
2. `worker/repositories` owns use-case orchestration and business invariants. A repository
   may combine read models and writes, but must not expose database rows to the HTTP layer.
3. `worker/db/read-models` is the default home for reads. Use Drizzle projections and joins
   so schema changes remain type checked.
4. `worker/db/queries` is reserved for queries that are materially clearer as SQL, such as
   dynamic search predicates or a set union. Every retained query must be parameterized,
   named, and return a declared row type.

## Write rules

- Use a single statement for a single-table mutation.
- Use `atomicBatch` when one business action changes more than one row or table.
- Put the audit write in the same atomic batch as the business write.
- Do not open long-lived transactions around network or model calls. Gather external input
  first, then commit the bounded D1 write set.

## Performance rules

- Avoid query-per-parent loops. Fetch collections with one typed query and group in memory
  only when the result set is bounded.
- Add indexes for actual filter and ordering prefixes, then assert them with
  `EXPLAIN QUERY PLAN` tests.
- Keep cursor pagination stable with a deterministic final key.
- Use D1 bindings directly and keep every promise awaited or returned.

## Public read cache

- Public catalog, calendar, season, and anime detail read models may use the
  optional Upstash Redis REST cache.
- Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as Worker
  secrets. Without them, requests read D1 directly.
- D1 remains the only source of truth. Redis failures fall back to D1 and must
  never fail a write or a public request.
- Successful Admin writes advance a versioned cache namespace after the D1
  commit. Old cache entries expire by TTL; do not wildcard-scan or dual-write.
