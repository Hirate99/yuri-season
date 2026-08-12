---
name: yuri-season-research
description: Incrementally research current-season yuri anime, protagonist groups, official character profiles and portraits, traceable Chinese name translations, official/staff/cast SNS, verified voice-actor accounts and work-specific posts, creator art, character birthdays, original fanworks, and community threads; produce traceable local-first updates for the 百合季 Admin. Use for routine seasonal updates, rapid broadcast/event checks, source discovery, and repair of incomplete anime/person/character/account records.
---

# Yuri Season Research

## Purpose

Update 百合季 without re-researching the whole season or waking a Cloudflare model on every poll. Deterministic source diffing comes first; model reasoning is reserved for changed items. Every public claim must retain evidence and an original URL.

Read `references/batch-schema.md` before creating a batch and `references/discovery-results.md` before recording discovery. For product policy, also read `docs/AGENTIC_UPDATES.md` and `docs/PRODUCT_DESIGN.md` in the repository.

## Choose a mode

- `incremental`: default. Check registered sources, process only pending diffs, and stop when nothing changed.
- `rapid`: one-off check scoped to a work, episode, broadcast, or event. Do not turn it into a permanent high-frequency loop.
- `discovery`: find missing official/cast accounts, work-specific cast posts, creator art, birthdays, original fanworks, or concentrated community threads. Run daily at most; broad seasonal discovery is normally weekly.
- `repair`: revisit a known conflict or incomplete entity and cite the conflicting observations.

## Scheduled budget

When one wake can run sync and discovery, run `incremental` first. If there is a pending diff, source error, or changed item, finish only that work and end the wake. Lease discovery only after a clean `0 changes / 0 source errors`. Never spend both budgets in one scheduled run.

Default limits are 20 registered sources for incremental sync or 4 leased discovery queries. Queue overflow for a later run. Never lease more than 12 queries.

## Discovery workflow

Discovery searches for unknown sources; it is separate from registered-source synchronization.

1. Run `bun run research:discover` to create or resume `.research-cache/discovery-plan.json`.
2. Use `--force` only for an explicitly requested full audit. Use `--replace` only after inspecting an unfinished campaign.
3. Lease a small workset with `bun run research:discover:next -- 4`.
4. Execute only leased queries and reuse `knownHits`. Preserve the query context in every result: `contentLane`, `animeId`, `personId`, `characterIds`, `accountId`, and `platform` when supplied.
5. Treat search results as leads. Open the original page and verify identity, entity match, date, authorship, and original-post status. Never turn a snippet into an observation.
6. Record every executed query, including zero-hit and blocked searches, using `references/discovery-results.md`, then run `bun run research:discover:record -- <results.json>`.
7. Put verified candidates into one traceable batch. Keep extraction and review as separate passes. Import through the normal batch workflow.

If a leased scope disappears before search, run `bun run research:discover:cancel -- <scope-type> <scope-id> <reason>`. For a full registered-source baseline use `bun run research:sync:full`; this is sync, not discovery.

## Incremental workflow

1. Set `YURI_RADAR_URL` and `YURI_ADMIN_TOKEN` locally. Never print either value. When production Admin is protected by Cloudflare Access, also set `YURI_ACCESS_CLIENT_ID` and `YURI_ACCESS_CLIENT_SECRET` for one app-scoped Service Auth policy that includes only the named research service token. Access and Worker token checks are independent. Do not rotate the production `ADMIN_TOKEN` merely because a new local value exists; first reuse the matching operator credential or obtain explicit approval for a production secret change.
2. Run `bun run research:diff`. It writes `.research-cache/pending-diff.json` only for changed item hashes.
3. If there are zero changes, report source errors and stop. Do not browse broadly “just in case.”
4. Reconcile `catalogChanges` as structured metadata; never turn them directly into feed candidates. Only `feedChanges` enter extraction and review.
5. Extract atomic claims and match registered anime/person/character/account IDs. Do not infer identity from names alone.
6. Review relevance, entailment, duplicate risk, source identity, safety, spoilers, attribution, and presentation separately from extraction.
7. Create one JSON file in `research-batches/`, following `references/batch-schema.md`.
8. Run `bun run research:import -- <batch.json>`. The server may downgrade `publish` to `hold`; never bypass policy.
9. After successful or duplicate-safe import run `bun run research:commit`. Keep the pending diff when import fails.

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

Use this only for queued `execution_target=local` discovery or repair work.

1. Lease with `bun run research:jobs -- lease 1`; never expose the stored lease token.
2. Follow the returned scope and budget. Heartbeat after 10 minutes with `bun run research:jobs -- heartbeat <job-id>`.
3. Import any batch first, then complete or partially complete the job with its `runId`.
4. On a real source/execution failure run `bun run research:jobs -- fail <job-id> <short reason>` and let the server schedule retries.

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

## Other research rules

- Official facts: use the official site/account, publisher, broadcaster, or an API entry cross-checked with an official source.
- Main-character coverage means the recurring protagonist group, not every entry on an official character or cast page. Use the official story, key visual, character grouping and cast prominence together; exclude managers, relatives, mentors, rival teams and episode-only guests unless the work consistently treats them as part of the central ensemble.
- For every in-season work, record the expected main-group count, the official page used to establish it and the time checked. Keep supporting-character records when already present, but mark them outside the main group so they remain editable in Admin without appearing in the public main cast or completeness score.
- Use the official native name as the identity anchor. A Chinese display name may be aligned to Moegirl only when an explicit one-to-one character or person match exists; record the exact Moegirl page as translation provenance. If no reliable match exists, preserve the native name or an already verified official Chinese name. Never invent a transliteration to make coverage look complete.
- Moegirl is a translation reference only. It cannot verify cast identity, character profile, birthday, social-account ownership or main-group membership; those still require first-party evidence. Recheck the main-group baseline when a new season is onboarded or the official character page materially changes.
- Staff/creator posts: require a verified or officially linked account and an explicit work/character/episode/event reference.
- Character birthdays: require a first-party profile, calendar, publisher material, or equivalent official source. Fan wikis are leads only.
- A full main-group birthday audit must execute exact-name searches across the work's official character/news pages, publisher or game first-party material, and indexed original posts from the official work/creator account. After completing the audit, run `bun run research:audit:birthdays` so every main character receives durable search memory. Verified dates retain the exact first-party page; zero-hit records are marked exhausted with `rerunOn: first_party_source_change` and must not be polled again on a timer. Never promote a search-engine summary when its original official post cannot be opened, and never substitute a real ship's launch date for a character birthday.
- Episode progress has two layers. Until a first-party episode record is captured, estimate the aired episode from the primary broadcast premiere, weekly cadence, total episode cap and any explicitly documented multi-episode premiere. When an official STORY, broadcaster or distribution page confirms an episode after its release time, persist `latestVerifiedEpisode`, `latestEpisodeSourceUrl` and `latestEpisodeCheckedAt`; that verified value overrides the estimate. Never advance from an unreleased preview alone.
- Creator art: preserve creator name and original post. A page that only says a product/event will include a newly drawn illustration does not prove that the image has been published; keep it as an official-news lead or reject it from the art lane. Publish a creator-art item only after opening the original page/post and confirming that the actual image or a viewable official preview is present.
- When the original page exposes an actual image or official preview, add a linked `media` record as well as the feed candidate so the work page can show it in the art/fanwork gallery. Preserve the original page as `media.originalUrl`. When caching is permitted and the image is verified safe, store the exact fetched bytes under the scoped `yuri/` prefix in the existing R2 bucket and use `https://r2.i-yuri.com/<key>` as `media.previewUrl` with `remote_preview`; retain creator attribution, the upstream image URL in evidence metadata, correction notices, safety, spoilers, and a rights/provenance note. Never upload a placeholder, `NOW PRINTING` image, search thumbnail, an image whose original page cannot be verified, or any image whose source explicitly prohibits redistribution, reposting, or embedding; keep those entries `link_only`. If no actual image is available, omit `media` and do not title the item as though viewers can see the artwork.
- Theme songs: use anime/label/official release pages to verify identity and classification. Preserve the source's exact designation: use `opening`, `ending`, `insert`, or `image` only when explicitly labelled; when the source says only `主題歌①/②` (or another generic theme-song label), use `theme` with the stated sequence and never infer OP/ED. Extract only explicitly credited fields. When an exact Apple Music track exists, prefer its artwork and track page over every other jacket source; otherwise use the anime, label, or artist's official release jacket. Retain the exact image URL and the page that associates it with the same title and performer. Keep the first-party evidence internally, but the public card should show only the Apple Music action when one exists. Never use an untraceable image or overwrite a conflicting occupied slot.
- Community threads: store title, URL, platform, and recent activity only. Do not copy bodies. Title an entry as `《作品名》动画讨论专楼` (or the equivalent work-name + thread-type form); keep platform/source labels and episode or broadcast progress in metadata or the summary, never in the title. Reuse canonical threads across works.
- Treat 萌战吧 as a separate discussion source from a work's own Tieba. It may contribute a sustained work review, episode discussion, character poll thread, or seasonal cross-work discussion when the original thread is accessible and materially covers the linked work. Store the platform exactly as `萌战吧`; exclude one-line reactions, pure image/meme posts, bait, search snippets and unrelated popularity contests. Reuse one cross-work thread through the canonical URL instead of duplicating it per anime.
- X and login-gated platforms: use an existing signed-in browser only when allowed. Do not scrape at scale or evade rate limits.

## Review boundaries

Recommend automatic publish only when all are true:

- source is `official` or `verified_creator` (verified cast posts are evaluated by server policy in their cast lane);
- evidence directly entails title and summary;
- safety is `safe`, spoiler is not `major`, and presentation is `link_only`;
- confidence is at least 0.88 for official or 0.92 for verified creator;
- item is not fanwork, an unverified birthday, new account identity, or community claim.

Otherwise use `hold`. Use `reject` for irrelevant, duplicate, contradicted, unsafe, or provenance-free material.

## Stop conditions

- Stop incremental work when there are no changed items.
- Stop and leave a local job when access needs a new login, CAPTCHA, extensive JavaScript, or unclear authorization.
- Do not perform an all-season web search during `incremental` or `rapid` mode.
