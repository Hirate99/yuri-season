---
name: yuri-season-research
description: Run evidence-backed current-season research for 百合季, including registered sources, official and verified-account timelines, tags, cast and creator posts, media, community discovery, onboarding, and data repair. Use for routine cycles, social audits, rapid checks, discovery, or incomplete records.
---

# Yuri Season Research

## Goal

Keep 百合季 current without waiting for a person to notice missing updates. Deterministic code owns coverage, cursors, deduplication, validation, and publication policy; the agent chooses what deserves earlier attention, verifies originals, interprets evidence, and handles exceptions.

Every public claim needs an accessible original URL and traceable evidence. Search snippets are leads, never observations.

Operate like a strong human editor: maintain whole-season awareness, inspect broadly, publish selectively, connect related updates, follow credible leads without prompting, and verify the reader-facing result after every material import.

## Read only what the task needs

- Timeline, tag, cast, creator, fanwork, media, community, birthday, or profile work: read `references/research-policy.md`.
- Recording discovery or timeline results: read `references/discovery-results.md`.
- Creating or importing observations and candidates: read `references/batch-schema.md`.
- Product or architecture changes: read `docs/AGENTIC_UPDATES.md` and `docs/PRODUCT_DESIGN.md`.

## Choose a profile

- `routine`: default for scheduled or unattended work. Finish source changes, then all currently due research.
- `social-audit`: explicitly recheck the current season's verified official accounts and tags first, followed by eligible verified creators, main cast, and 2.5D members. It must not reopen unrelated music, community, fanwork, or supporting-cast identity work.
- `incremental`: explicitly registered-source-only. Do not broaden it into web or social discovery.
- `rapid`: one work, episode, broadcast, or event. Do not create a permanent high-frequency loop.
- `repair`: a known conflict, stale projection, missing entity field, or incomplete media/event/resource chain.

Natural-language requests such as “增量查找”“日常更新” or “看看最近有什么” mean `routine` unless the user explicitly says source-only. “把其他动画账号也搜一遍” means `social-audit`, not global `--force`.

## One operating loop

1. Run `bun run research -- cycle --profile=routine` (or the explicitly requested profile). It resumes existing work automatically and stops before discovery when a real source diff needs processing.
2. Lease work with `bun run research -- next --limit=<n>`. Execute only leased tasks and obey each task's structured `operation`, required surfaces, cursor, and completion policy.
3. Open originals, record every inspected stable object ID, build any traceable batch, then submit the result with `bun run research -- submit <results.json>`.
4. Import verified candidates through the normal batch workflow and reconcile every supported projection affected by the evidence. A feed card alone is not completion when the same source supports media, events, accounts, schedule, cast, or music.
5. Pass the reader-facing completion gate below for every published item. An accepted batch or populated database row is not proof that the public result works.
6. Repeat until `bun run research -- finish` reports convergence. A result chunk, lease size, or successful import is never a stop condition.

The legacy `research:diff`, `research:discover:*`, `research:import`, and specialist audit commands remain compatibility or maintenance entry points; routine operation should use the unified CLI.

## Coverage and scheduling contract

- For every completed active task, choose `nextCheckAt` from recent activity, event proximity, unresolved leads, platform health, and prior yield. Include short reason codes. Do not maintain a growing table of fixed per-lane cadences in this skill.
- Code enforces the maximum freshness deadline. A target cannot be deferred beyond it, and repeatedly deferred or stale work returns to the mandatory pool.
- `timeline_scan` and `tag_scan` require structured coverage. Search-engine results cannot complete them. A partial scan keeps its resume cursor and remains unfinished.
- Reaching the previous committed cursor is the proof of a complete incremental scan. Only complete scans advance the committed cursor and normal next-check time.
- Record every inspected original with a stable platform object ID, including `ignored` and `rejected`. This separates “nothing new” from “not actually checked” and prevents repeat review.
- Zero useful candidates are normal only after the task's completion policy passes. Login, CAPTCHA, or platform failure blocks that surface only and must not masquerade as an exhaustive zero result.

## Evidence and publication invariants

- Verify identity, authorship, entity match, date, original-post status, safety, spoilers, attribution, reuse policy, and duplicate risk separately.
- Keep `excerpt` as an internal paraphrase. When allowed, keep readable original-language text in `publicText` and a faithful Chinese translation in `publicTranslation`; neither an editorial summary nor a search snippet is a translation.
- If public copy says an image, illustration, photo, visual, or video was posted, missing linked media is a preflight failure unless the media is unavailable or policy requires link-only.
- Public rights copy stays human-readable (`图片来自原帖` or `官方图片`). Storage, object-key, bucket, and byte-cache details are internal.
- Use local CLI/Admin APIs for imports and state. Never fall back to UI automation for routine writes, and never change production credentials merely to make a local command pass.

## Reader-facing completion gate

- For every published item, read back the public API or page and verify title, summary, original text, Chinese translation, source link, related work, attribution, timestamps, and every projection supported by the evidence.
- When an original contains publishable media, completion requires the actual source asset: inspect it, preserve its provenance and dimensions, upload it to remote production storage, link the resulting media record, then confirm the public URL returns the expected media type and the public item points to it. A cover fallback, external hotlink, local Wrangler object, or merely populated `media` input does not pass.
- Use the Cloudflare and Wrangler skills for production media work. Require explicit remote R2/D1 operations and verify the command reports the remote resource before accepting success. If reuse is unsupported, keep the item link-only with a clear policy reason instead of uploading it.
- Do not run `research -- finish` while any published item has a missing, placeholder, inaccessible, or incorrectly attributed asset. Repair it or record an evidence-backed link-only exception first.
- Treat stored datetimes as instants. Publicly returned timestamps must include `Z` or an explicit offset, and `publishedAt`, `capturedAt`, and correction times must all render in the same viewer timezone. A zone-less SQLite `CURRENT_TIMESTAMP` value must be normalized before it reaches the client.

## Learning and stop conditions

When an operation exposes a reusable failure, first add a typed invariant, validator, deterministic reconciler, anomaly check, or regression fixture. Update this skill only when the orchestration or semantic policy truly changes; do not accumulate event-specific fixes or transient URLs here.

Continue unrelated work when one source or platform fails. Stop only when due work converges, a global credential/configuration failure prevents all useful progress, or the execution window ends after recoverable state is saved.
