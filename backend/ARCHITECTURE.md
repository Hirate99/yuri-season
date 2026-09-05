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

Public reads use D1 directly. Admin queries use the `admin` query-key prefix;
mutations invalidate that prefix, refreshing active views and marking inactive
views stale. Background refreshes retain the active editor and its selection.

Input contracts live in `src/domain/inputs`: Zod validates runtime values and
derives write types. Hono uses `@hono/zod-validator` with the existing HTTP error
shape. Context-dependent workflow parsers retain the Hono validator adapter.
Admin forms share their individual schemas through React Hook Form and the Zod
resolver. Import the individual schema rather than the resource envelope in UI
code. Server refreshes must not reset dirty form values.

`/admin` is a layout with nested overview, works, review, coverage, automation and
seasons routes. Review and automation tabs use validated search parameters.
Each form owns its mutation state; query and mutation options live together in
`src/features/admin/queries.ts`. The layout owns only the shared summary query.
Dedicated page read endpoints return their own data, without unrelated empty
arrays. The existing dashboard endpoint remains compatible with research scripts.
Overview and coverage use `src/domain/coverage.ts` for the same completeness rules.

TanStack Query owns admin server state and Feed pagination. Each router gets its
own QueryClient; the official Router integration handles SSR hydration. Feed
loaders populate the same infinite query used by the component, preserving loaded
pages on navigation. Other public loaders, including deferred anime-related data,
remain router-owned. Local selections and search inputs stay in component state.

## Database rules

- Every persisted business table is declared in `infrastructure/db/schema`.
- Drizzle is the default for reads and writes, including joins and CTEs.
- Public and admin reads share field selections in `read-models/detail.ts`;
  each query keeps its own visibility filters, ordering, and admin-only fields.
- Source check updates live in `repositories/source-checks.ts`. Worker checks use
  the database clock; timestamped local checks reject stale or replayed results.
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
