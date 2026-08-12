---
name: yuri-season-research
description: Incrementally research current-season yuri anime, protagonist groups, official character profiles and portraits, traceable Chinese name translations, official/staff/cast SNS, verified voice-actor accounts and work-specific posts, creator art, character birthdays, original fanworks, and community threads; produce traceable local-first updates for the 百合季 Admin. Use for routine seasonal updates, rapid broadcast/event checks, source discovery, and repair of incomplete anime/person/character/account records.
---

# Yuri Season Research

## Purpose

Update 百合季 without re-researching the whole season or waking a Cloudflare model on every poll. Deterministic source diffing comes first; model reasoning is reserved for changed items. Every public claim must retain evidence and an original URL.

Read `references/batch-schema.md` before creating a batch. For policy details, read the project files `docs/AGENTIC_UPDATES.md` and `docs/PRODUCT_DESIGN.md`.

## Choose a mode

- `incremental` is the default. Check registered sources, process only the pending diff, and stop when there is no change.
- `rapid` is a one-off check explicitly scoped to a work or event. Never turn it into a permanent high-frequency loop.
- `discovery` searches for missing official/cast accounts, work-specific cast posts, creator art, verified birthdays, original fanwork posts, or concentrated discussion threads. Run daily at most; broad season discovery is normally weekly.
- `repair` revisits a known conflict or incomplete entity and must cite the conflicting observations.

## Scheduled routine budget

When one scheduled wake can run both known-source sync and discovery, run `incremental` first. If there is a pending diff, any source error, or any changed item, finish only that incremental or repair work and end the wake. Lease discovery queries only after a clean `0 changes / 0 source errors` result. Never spend both budgets in one scheduled run.

## Discovery workflow

Discovery is not a full poll of registered sources. Keep source synchronization and unknown-source search as separate runs.

1. Run `bun run research:discover`. It reads the catalog, per-work resources, durable search memory and prior hit outcomes, then creates `.research-cache/discovery-plan.json` as a resumable campaign. Queries whose `nextSearchAt` is still in the future are omitted.
2. Use `--force` only for an explicitly requested from-scratch audit. `--limit` controls campaign size, not simultaneous searches. Use `--replace` only to discard an unfinished campaign after inspecting its status.
3. Run `bun run research:discover:next -- 4` to lease a small workset. Four is the default; never lease more than 12. An unrecorded lease returns to pending after two hours, so interruption does not require rebuilding the campaign.
4. Execute only the leased queries. Reuse `knownHits`: previously published, held, rejected or ignored URLs are not new discoveries unless the original page materially changed.
5. Search results are leads. Open the original page and verify identity, entity match, date, authorship and whether it is a concentrated thread or original media post. Search snippets never become observations.
6. Write one result file using `references/discovery-results.md`, including zero-hit and blocked searches. Submit it with `bun run research:discover:record -- <results.json>`. The recorder writes durable search memory first, then completes the local checkpoint; replay is safe if the response is lost.
7. Put verified candidates in one traceable batch, perform extraction and review as separate passes, and import it through the normal batch workflow. Newly discovered community threads and fanworks remain `hold` in phase one.

If a leased scope is removed from the catalog before it is searched, run `bun run research:discover:cancel -- <scope-type> <scope-id> <reason>`. Cancellation completes those work items without fabricating a zero-hit search or writing search memory.

For a full registered-source baseline, run `bun run research:sync:full`; this is synchronization, not discovery. If its Admin submission fails after crawling, fix access and run `bun run research:sync:record` to replay the cached health and memory records without refetching sources.

## Incremental workflow

1. Set `YURI_RADAR_URL` and `YURI_ADMIN_TOKEN` in the local environment. Never print either value. When production Admin is protected by Cloudflare Access, also set `YURI_ACCESS_CLIENT_ID` and `YURI_ACCESS_CLIENT_SECRET` for one app-scoped Service Auth policy that includes only the named research service token. Access and Worker token checks are independent. Do not rotate the production `ADMIN_TOKEN` merely because a new local value exists; first reuse the matching operator credential or obtain explicit approval for a production secret change.
2. Run `bun run research:diff`. This reads the Admin source registry, performs conditional requests, and writes `.research-cache/pending-diff.json` only when item-level hashes changed. The local transport can repair a broken system-DNS lookup through public DNS, but only for standard HTTPS sources resolving to a public IPv4 address.
3. If the command reports zero changes, report source errors if any and stop. Do not browse broadly and do not call a model “just in case.”
4. Read the pending diff. `catalogChanges` are structured metadata changes: reconcile them against official sources or leave them as observations, but never turn them into feed candidates. Only `feedChanges` enter extraction and review. Open only the changed original pages needed to verify either list. Prefer official pages and public platform APIs; use search only when a changed item lacks enough context.
5. Extract atomic claims before writing feed copy. Match the work/person/character using registered IDs. Do not infer account ownership, birthdays, relationships, or dates from names alone.
6. Perform a separate review pass against the evidence. Check relevance, factual entailment, duplicate risk, source identity, safety, spoilers, creator attribution, and presentation mode.
7. Create one JSON batch in `research-batches/` following the reference schema. Merge related changes into one batch; do not generate one model call or file per source.
8. Import the batch with `bun run research:import -- <batch.json>`. This sends the file as UTF-8 bytes and avoids shell-specific request encoding. The server may downgrade `publish` to `hold`; never bypass that policy.
9. Only after a successful or duplicate-safe import, run `bun run research:commit`. If import fails, keep the pending diff for repair.
10. If inspection proves every change is a normalizer false positive, run `bun run research:discard`, fix the connector, and rerun the diff. Discard never advances committed source state.

When verified theme-song records contain Apple Music track URLs, run `bun run research:music:apple-covers` first, inspect the dry-run, then run it again with `--apply`. This deterministically replaces any other jacket with the exact Apple artwork and makes the Apple track page the cover link without using Admin UI.

Routine incremental checks, discovery recording, job updates, and batch imports must use the local `research:*` commands and Admin API. Never use Computer Use, a browser file chooser, or UI automation as an import fallback. If credentials fail, repair the local `.dev.vars`, Access Service Token policy, or Worker token deliberately and re-run the command; reserve the Admin upload UI for an explicit one-off human handoff.

## Main-character profile and portrait repair

1. Run `bun run research:audit:characters` before editing. Treat Chinese-name provenance, profile completeness, and portrait completeness as separate checks; never use an official Japanese page as evidence for a Chinese display name.
2. Use the work's official character page, publisher page, or first-party character API for profiles and portraits. Preserve the exact image URL and the specific public page that associates it with the character. Search thumbnails, wikis, reposts, and cast photos are not character portraits.
3. Prefer an official face, thumb, or icon that remains legible in the public 48 px square over a full-body standing image. When the only first-party asset is tall or horizontal, keep the original URL and add a deterministic focal-point rule in the UI; do not silently crop, rehost, or replace it with an untraceable image.
4. Verify every portrait returns HTTP 200 and either an image content type or a valid PNG/JPEG/WebP signature. Visually inspect at least one representative image from every asset family and confirm the official page's name-to-image mapping.
5. Encode repeatable repairs in `scripts/sync-main-character-profiles.ts`. Run `bun run research:characters:sync` first, review the dry-run, then run `bun run research:characters:sync --apply`. The command must verify anime ID, character ID, main-group membership, image bytes, and preserve unrelated cast/person/birthday fields.
6. Run `bun run research:audit:characters` again. Require `withProfile` and `withPortrait` to equal `mainCharacters`; unresolved `nameSourceUrl` is acceptable only when no traceable Chinese source exists.

## Local job workflow

Use this only for queued `execution_target=local` discovery or repair work. Ordinary incremental checks do not need a lease.

1. Run `bun run research:jobs -- lease 1`. The command stores the one-time lease token under `.research-cache/job-leases/` and prints only the safe job fields.
2. Follow the returned `jobType`, scope, input and budget. Never open or copy the stored lease file into chat output.
3. If work lasts more than 10 minutes, run `bun run research:jobs -- heartbeat <job-id>` before the 20-minute lease expires. An expired job may be recovered by another run; stop if heartbeat reports a stale lease.
4. Import any resulting batch first. `research:import` returns its `runId`.
5. Report success with `bun run research:jobs -- complete <job-id> <run-id>`, or partial work with `bun run research:jobs -- partial <job-id> <run-id>`. If no batch was needed, omit `run-id`.
6. For a real source or execution failure, run `bun run research:jobs -- fail <job-id> <short reason>`. The server chooses retry delay or dead-letter status; do not loop locally.

Completion uses a persisted idempotency key. If the response is lost, rerun the same command before taking another lease.

## Required data chains

### Voice actor lane

Model cast content as:

`character → cast credit → person → verified account → work-specific original post`

- Discover X and Instagram identities independently. A person with verified X may still need Instagram discovery.
- Account discovery is not account verification. Store a proposed `account_identity` claim and an unverified local account; a human or first-party cross-link must verify it later.
- A `cast_post` observation uses the verified account itself as provenance and supplies `animeId`, `personId`, `accountId`, optional `characterId`, and stable `platformObjectId`.
- The post must explicitly mention the work, character, episode, or relevant event. A generic actor update is not a candidate.
- The importer validates the cast credit, account ownership, verification state, and post URL. It derives `sourceIdentity: cast`; do not rely on batch text to assert that identity.
- Keep cast posts in their own deduplication lane: anime + account + platform object ID. Do not merge them with ordinary official updates merely because the URLs or titles look similar.

### Fanwork lane

Model fanwork as:

`anime → original creator → original creator post → reviewed link-only candidate`

- Search Pixiv, X, and Instagram separately. Use only the original creator post, never an aggregator, mirror, quote-post, or repost.
- Supply the creator name, optional creator profile URL, original post URL, media class, safety, spoiler level, and rights note where known.
- Candidate URL and `media.originalUrl` must be the same canonical original post.
- Fanwork is always `link_only`, `sourceIdentity: community`, and `hold` in phase one—even when the creator identity and post are verified.
- Deduplicate fanwork in its own lane by stable platform object/original URL. Do not collapse it into cast, creator-art, or official lanes.

## Research rules

- Official facts: official site, official account, publisher, broadcaster, or an API entry cross-checked with an official source.
- Main-character coverage means the recurring protagonist group, not every entry on an official character or cast page. Use the official story, key visual, character grouping and cast prominence together; exclude managers, relatives, mentors, rival teams and episode-only guests unless the work consistently treats them as part of the central ensemble.
- For every in-season work, record the expected main-group count, the official page used to establish it and the time checked. Keep supporting-character records when already present, but mark them outside the main group so they remain editable in Admin without appearing in the public main cast or completeness score.
- Use the official native name as the identity anchor. A Chinese display name may be aligned to Moegirl only when an explicit one-to-one character or person match exists; record the exact Moegirl page as translation provenance. If no reliable match exists, preserve the native name or an already verified official Chinese name. Never invent a transliteration to make coverage look complete.
- Moegirl is a translation reference only. It cannot verify cast identity, character profile, birthday, social-account ownership or main-group membership; those still require first-party evidence. Recheck the main-group baseline when a new season is onboarded or the official character page materially changes.
- Creator/staff/cast posts: the account must already be verified or be linked from an official source. The post must explicitly reference the work, character, episode, or event.
- Character birthdays: require a character profile, official calendar, publisher material, or another first-party source. Fan wikis are leads only.
- A full main-group birthday audit must execute exact-name searches across the work's official character/news pages, publisher or game first-party material, and indexed original posts from the official work/creator account. After completing the audit, run `bun run research:audit:birthdays` so every main character receives durable search memory. Verified dates retain the exact first-party page; zero-hit records are marked exhausted with `rerunOn: first_party_source_change` and must not be polled again on a timer. Never promote a search-engine summary when its original official post cannot be opened, and never substitute a real ship's launch date for a character birthday.
- Episode progress has two layers. Until a first-party episode record is captured, estimate the aired episode from the primary broadcast premiere, weekly cadence, total episode cap and any explicitly documented multi-episode premiere. When an official STORY, broadcaster or distribution page confirms an episode after its release time, persist `latestVerifiedEpisode`, `latestEpisodeSourceUrl` and `latestEpisodeCheckedAt`; that verified value overrides the estimate. Never advance from an unreleased preview alone.
- Creator art: preserve creator name and original post. A page that only says a product/event will include a newly drawn illustration does not prove that the image has been published; keep it as an official-news lead or reject it from the art lane. Publish a creator-art item only after opening the original page/post and confirming that the actual image or a viewable official preview is present.
- When the original page exposes an actual image or official preview, add a linked `media` record as well as the feed candidate so the work page can show it in the art/fanwork gallery. Preserve the original page as `media.originalUrl`. When caching is permitted and the image is verified safe, store the exact fetched bytes under the scoped `yuri/` prefix in the existing R2 bucket and use `https://r2.i-yuri.com/<key>` as `media.previewUrl` with `remote_preview`; retain creator attribution, the upstream image URL in evidence metadata, correction notices, safety, spoilers, and a rights/provenance note. Never upload a placeholder, `NOW PRINTING` image, search thumbnail, an image whose original page cannot be verified, or any image whose source explicitly prohibits redistribution, reposting, or embedding; keep those entries `link_only`. If no actual image is available, omit `media` and do not title the item as though viewers can see the artwork.
- Theme songs: use the anime site, label site, or official release page to verify identity and classification. Preserve the source's exact designation: use `opening`, `ending`, `insert`, or `image` only when explicitly labelled; when the source says only `主題歌①/②` (or another generic theme-song label), use `theme` with the stated sequence and never infer OP/ED. Extract the title, performer and only explicitly credited lyricist/composer/arranger fields. When an exact Apple Music track exists, prefer its artwork and track page over every other jacket source; otherwise use the anime, label, or artist's official release jacket. Retain the exact image URL and the page that associates it with the same title and performer. Keep the first-party evidence internally, but the public card should show only the Apple Music action when one exists. A missing jacket does not block the song record. Reuse the global track when title and performer match; never overwrite a conflicting per-work slot.
- Fanwork: use the original creator post, never an aggregator or repost. Always hold for human review in phase one.
- Tieba, NGA, Yurikai and similar threads: store only thread title, URL, platform, and recent activity. Do not copy bodies; hold new thread discoveries for review. Title a community entry as `《作品名》动画讨论专楼` (or the equivalent work-name + thread-type form); keep platform/source labels and episode or broadcast progress in metadata or the summary, never in the title. One thread may relate to multiple works; reuse the canonical URL and attach another work instead of duplicating it.
- Treat 萌战吧 as a separate discussion source from a work's own Tieba. It may contribute a sustained work review, episode discussion, character poll thread, or seasonal cross-work discussion when the original thread is accessible and materially covers the linked work. Store the platform exactly as `萌战吧`; exclude one-line reactions, pure image/meme posts, bait, search snippets and unrelated popularity contests. Reuse one cross-work thread through the canonical URL instead of duplicating it per anime.
- Existing community threads use the thread title, reply count, and last visible post ID as stable change signals. Ignore view counts and action links such as favorite, recommend, report, login, and URLs containing `formhash`.
- X and login-gated platforms: use an existing signed-in browser only when allowed. Do not scrape at scale or attempt to evade rate limits.

## Review boundaries

Recommend automatic publish only when all are true:

- source is `official` or `verified_creator`;
- evidence directly entails the title and summary;
- safety is `safe`, spoiler is not `major`, and presentation is `link_only`;
- confidence is at least 0.88 for official or 0.92 for verified creator;
- the item is not fanwork, an unverified birthday, a new account identity, or a community claim.

Otherwise use `hold`. Use `reject` for irrelevant, duplicate, contradicted, unsafe, or provenance-free material.

## Token and scope budget

- Default: at most 20 registered sources for incremental sync or 4 leased discovery queries. Queue overflow for the next run instead of opening more model calls.
- Summarize related changes together. Reuse facts already present in the Admin response.
- Do not spend a model call on a batch containing only `catalogChanges`; deterministic comparison and targeted official verification are sufficient.
- Do not perform all-season web search during `incremental` or `rapid` mode.
- Stop and leave a local job when a source needs login, CAPTCHA, extensive JavaScript, or unclear authorization.
