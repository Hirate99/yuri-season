# Backend architecture

The backend is a Cloudflare Workers modular monolith rooted at `backend/`. Backend
imports use `~/`; the frontend keeps `@/` for `src/`.

## Dependency direction

```text
Worker entry -> HTTP routes -> application services -> repositories -> database
                                      |
                                      +-> research workflows / domain policy
```

- `src/server.ts` adapts TanStack Start to the Worker and stays thin.
- `backend/http/routes/{public,admin,research}` owns Hono route contracts,
  validation, status codes, and cache behavior. Files are grouped by URL prefix and
  capability. Routes use request services and never access D1 or repositories.
- `backend/application` owns use-case and cross-module orchestration.
- `backend/repositories` owns persistence for one module or aggregate. A repository
  does not call application services or compose unrelated repositories.
- `backend/research` owns research workflows and pure decision policy.
- `backend/infrastructure` contains Cloudflare, authentication, cache, and database
  adapters.

Use small functions and factories. Do not add interfaces that merely mirror a
concrete function unless there is a real alternate implementation or test boundary.

## HTTP and Hono RPC

Route modules are chained Hono applications so route literals remain visible to
Hono's type system. `backend/http/api.ts` exports `ApiType`; `src/lib/rpc.ts`
creates `hc<ApiType>()` clients for both the browser and operational scripts. Do not
duplicate internal API paths, request DTOs, response casts, or generic `fetch<T>`
wrappers in consumers.

Mutation handlers invalidate public data explicitly after successful writes. Cache
invalidation is not inferred from URL prefixes.

## Database rules

- Every persisted business table is declared in `infrastructure/db/schema`.
- Drizzle is the default for reads and writes, including joins and CTEs.
- Native D1 statements are restricted to `infrastructure/db/native`. They are only
  for operations Drizzle cannot express clearly, currently atomic job state
  transitions and the dynamically filtered feed query.
- Every native statement is parameterized and returns a declared row type.
- Multi-row business writes use D1 batch semantics and include their audit write in
  the same atomic batch.
- Never keep a database transaction open across a network or model call.

## Query performance

- Do not issue a query per parent row. Coverage and feed query counts must remain
  constant as result size grows.
- Use deterministic cursor ordering.
- Indexes must match real filter/order prefixes and important plans remain protected
  by `EXPLAIN QUERY PLAN` tests.
- Every promise is awaited, returned, or deliberately passed to
  `executionContext.waitUntil()`.

## Public cache

D1 is the source of truth. The optional Redis cache is read-through and must fall
back to D1 when unconfigured or unavailable. Successful Admin and research writes
advance the public cache namespace after the database commit; old entries expire by
TTL.

## Migration rules

Applied migrations are immutable. New prefixes are unique and monotonically
increasing. Operational seed or discovery data belongs in explicit idempotent import
scripts, not schema migrations.
