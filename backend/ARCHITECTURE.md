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
- `backend/infrastructure` contains Cloudflare, authentication, and database
  adapters.

Use small functions and factories. Do not add interfaces that merely mirror a
concrete function unless there is a real alternate implementation or test boundary.

## HTTP and Hono RPC

Route modules are chained Hono applications so route literals remain visible to
Hono's type system. `backend/http/api.ts` exports `ApiType`; `src/lib/rpc.ts`
creates `hc<ApiType>()` clients for both the browser and operational scripts. Do not
duplicate internal API paths, request DTOs, response casts, or generic `fetch<T>`
wrappers in consumers.

Public reads use D1 directly. Admin mutations refresh only the affected view or resource;
background refreshes retain the active editor and its selection.

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

- Batch independent D1 reads with Drizzle when they belong to the same response.
  Preserve the query builders until the batch executes. Joined projections need
  unique SQL column aliases: D1 batch results are objects, so duplicate column
  names lose values before Drizzle can map them.
- Measure executed statements and D1 calls separately. A batch reduces calls,
  not the number of SQL statements; preparing a statement is not executing it.
- Do not issue a query per parent row. Coverage and feed query counts must remain
  constant as result size grows.
- Use deterministic cursor ordering.
- Persist instants as canonical UTC ISO strings before using indexed text ordering;
  date-only calendar values remain `YYYY-MM-DD`.
- Indexes must match real filter/order prefixes and important plans remain protected
  by `EXPLAIN QUERY PLAN` tests.
- Every promise is awaited, returned, or deliberately passed to
  `executionContext.waitUntil()`.

## Public freshness

D1 is the direct source for public reads. Public HTTP responses use a short bounded
browser cache, while route `staleTime` prevents repeat reads during ordinary tab
navigation. Do not add an external read-through cache without measured evidence that
it improves end-to-end latency.

## Migration rules

Applied migrations are immutable. The historical `0027` prefix collision is retained
because both files may already be applied; every new prefix is unique and monotonically
increasing from `0032`. Operational seed or discovery data belongs in explicit idempotent import
scripts, not schema migrations.
