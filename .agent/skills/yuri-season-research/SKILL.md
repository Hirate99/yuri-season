---
name: yuri-season-research
description: Maintain 百合季 through evidence-backed official-site and verified-X updates across work, cast, original-creator, and production-staff accounts, plus explicitly scoped discovery, calendar work, and publication repair. Use for routine updates, requested audits or discovery, and incomplete records.
---

# Yuri Season Research

## Goal

Keep 百合季 current without rebuilding the whole research universe on every update. Deterministic code owns coverage, cursors, deduplication, validation, and publication policy; the agent verifies originals, interprets evidence, applies editorial judgment, and handles exceptions.

Every public claim needs an accessible original URL and traceable evidence. Search snippets are leads, never observations.

Operate like a strong human editor: maintain a reliable watchlist, inspect every due tracked surface incrementally, follow useful evidence, choose timely editorial questions, and verify the reader-facing result. Coverage rules are the baseline, not the limit of editorial judgment; broad exploration remains a separate assignment.

## Read only what the task needs

- Routine official-site and verified-X updates: read `references/update-policy.md`.
- Explicit tag, cast, creator, fanwork, community, birthday, profile, or catalog discovery: read `references/research-policy.md`.
- Notable online/offline events, concerts, voice-actor appearances, conventions, and calendar maintenance: read `references/event-calendar-policy.md`.
- Public titles, media, storage, migrations, deduplication, or publication repair: read `references/publication-policy.md`.
- Recording discovery or timeline results: read `references/discovery-results.md`.
- Creating or importing observations and candidates: read `references/batch-schema.md`.
- Product or architecture changes: read `docs/AGENTIC_UPDATES.md` and `docs/PRODUCT_DESIGN.md`.

## Choose a profile

- `routine`: default. Process registered official-site/feed diffs, then every due timeline for already verified, enabled X accounts linked to the work: project/official accounts, cast, original authors/creators, and credited production staff. Follow related originals and allow bounded editorial searches about tracked works under `references/update-policy.md`. Missing accounts, tag scans, new works, fanwork, and community discovery remain separate.
- `social-audit`: explicit. Recheck eligible already verified social accounts and official tag coverage; do not discover or verify missing accounts.
- `discovery`: explicit. Search the requested catalog, tag, music, media, fanwork, or community scope. Account discovery remains excluded.
- `account-discovery`: explicit and scoped. Require `--anime-id=<ids>` or `--person-id=<ids>`; optionally use `--platform=<values>`. It may find or verify accounts only inside that requested scope.

`rapid` and `repair` describe a bounded task scope, not CLI profile names. Natural-language requests such as “更新网站”“做新一轮更新”“日常更新” or “看看最近有什么” mean `routine`. Do not infer `discovery`, `social-audit`, or `account-discovery`; the user must request that expansion.

## One operating loop

1. Run `bun run research -- cycle --profile=routine` or the explicitly requested profile. Routine state is separate from explicit Discovery state. When a real source diff is pending, process and import it before rerunning the routine cycle.
2. Lease coverage work with `bun run research -- next --profile=<profile> --limit=<n>` and obey each task's structured operation, surface, cursor, and completion policy. Related evidence checks and bounded routine editorial searches use the same publication pipeline without starting a Discovery campaign.
3. Open originals, record every inspected stable object ID, build any traceable batch, then submit with `bun run research -- submit <results.json> --profile=<profile>`.
4. Import verified candidates through the normal batch workflow and reconcile every supported projection affected by the evidence. A feed card alone is not completion when the same source supports media, events, accounts, schedule, cast, or music.
5. Pass the reader-facing completion gate in `references/publication-policy.md` for every published item. An accepted batch or populated database row is not proof that the public result works.
6. Repeat until `bun run research -- finish --profile=<profile>` reports convergence for the requested profile, then check editorial completion under `references/update-policy.md`. CLI convergence proves planned coverage only; a result chunk, lease size, or successful import is never a stop condition.

The legacy `research:diff`, `research:discover:*`, `research:import`, and specialist audit commands remain compatibility or maintenance entry points; routine operation should use the unified CLI.

## Coverage and scheduling contract

- Routine planned coverage covers registered-source processing and due verified-X watchlist tasks. Resolve or checkpoint in-scope editorial leads separately; dormant or unrequested Discovery work must not enter its campaign or block its completion.
- Explicit Discovery completion covers only the requested profile and entity/platform scope. Account leads outside `account-discovery` remain durable leads, not automatic follow-up work.
- For every completed active task, choose `nextCheckAt` from recent activity, event proximity, unresolved leads, platform health, and prior yield. Include short reason codes.
- Code enforces the maximum freshness deadline. A target cannot be deferred beyond it, and repeatedly deferred or stale work returns to the mandatory pool.
- `timeline_scan` and `tag_scan` require structured coverage. Search-engine results cannot complete them. A partial scan keeps its resume cursor and remains unfinished.
- Reaching the previous committed cursor is the proof of a complete incremental scan. Only complete scans advance the committed cursor and normal next-check time.
- Record every inspected original with a stable platform object ID, including `ignored` and `rejected`. This separates “nothing new” from “not actually checked” and prevents repeat review.
- Zero useful candidates are normal only after the task's completion policy passes. Login, CAPTCHA, or platform failure blocks that surface only and must not masquerade as an exhaustive zero result.
- Routine imports event facts encountered on tracked official sites or X accounts. Periodic Comic Market and broader calendar audits are independent due tasks governed by `references/event-calendar-policy.md`; they do not restart on every website update.

### Signed-in browser surfaces and rate limits

- For X, Instagram, Pixiv, 百合会, and other work that requires a signed-in or interactive surface, read and use the available browser-control skill before declaring the surface unavailable. The absence of an already-open tab or an uninitialized browser binding is not evidence of a blocker.
- Unless the user explicitly chooses a different order, try the app's in-app browser first. If it is unavailable, lacks the required signed-in state, or cannot perform the required interaction, then try the user's Chrome browser. Only after both applicable surfaces have been attempted may the task record that browser access is blocked; preserve the surface-specific failure evidence instead of reporting a generic “no browser” blocker.
- On first use of each browser surface in a research run, open one new dedicated research tab. Reuse that tab by navigating it across the run; do not take over an unrelated existing tab and do not open a fresh tab for each query, account, or original. Create a replacement only when the dedicated tab was closed, became stale, or is no longer part of the browser session.
- Keep platform requests sequential and bounded. Reuse inspected pages, stable IDs, and cursors instead of reloading the same timeline or search results. If a platform returns HTTP 429 or an equivalent rate-limit signal, stop requests to that platform, preserve completed observations and the resume cursor, honor `Retry-After` when present, and defer the remaining work with a concrete reason. Do not immediately retry, refresh repeatedly, increase concurrency, or switch browsers to evade the limit; continue unrelated platforms when possible.

## Evidence and publication invariants

- Verify identity, authorship, entity match, date, original-post status, safety, spoilers, attribution, reuse policy, and duplicate risk separately.
- Keep `excerpt` as an internal paraphrase. When allowed, keep readable original-language text in `publicText` and a faithful Chinese translation in `publicTranslation`; neither an editorial summary nor a search snippet is a translation.
- Before writing a candidate or translation, read the linked database entities and reuse their canonical public names exactly in titles, summaries, `publicTranslation`, and translated hashtags. Do not introduce a fresh literal translation for an entity that already has a canonical display name.
- Every automatically published official-site or social observation must declare and satisfy its media disposition. Image-bearing official pages follow the same upload and public-readback requirement as X posts; missing operational capability means hold or incomplete, never a silent text-only fallback.
- Keep every public Feed title naturally readable while retaining canonical work identity. Apply the detailed title, media, storage, deduplication, timestamp, and readback rules in `references/publication-policy.md`.
- Use local CLI/Admin APIs for imports and state. Never fall back to UI automation for routine writes, and never change production credentials merely to make a local command pass.

## Learning and stop conditions

When an operation exposes a reusable failure, first add a typed invariant, validator, deterministic reconciler, anomaly check, or regression fixture. Update this skill only when the orchestration or semantic policy truly changes; do not accumulate event-specific fixes or transient URLs here.

Keep repository tooling durable. One-off audits, repair builders, data extracts, candidate inspectors, and batch generators belong in the workspace temporary directory and must be removed after the verified import. Do not add or commit a top-level `scripts/*.ts` file unless it is a reusable maintained entry point exposed by `package.json` and covered by tests; use the unified CLI or existing importer for ordinary research work.

Continue unrelated work when one source or platform fails. Stop only when due work converges, a global credential/configuration failure prevents all useful progress, or the execution window ends after recoverable state is saved.
