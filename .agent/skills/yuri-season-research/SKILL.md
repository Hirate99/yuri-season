---
name: yuri-season-research
description: Incrementally research current-season yuri anime and related 2.5D projects, protagonist groups, official character profiles and portraits, traceable Chinese name translations, official/staff/cast SNS, verified voice-actor and project-member accounts, relevant posts and events, creator art, character birthdays, original fanworks, and community threads; produce traceable local-first updates for the 百合季 Admin. Use for routine seasonal updates, rapid broadcast/event checks, source discovery, and repair of incomplete anime/person/character/account records.
---

# Yuri Season Research

## Purpose

Update 百合季 without re-researching the whole season or waking a Cloudflare model on every poll. Deterministic source diffing comes first; model reasoning is reserved for changed items. Every public claim must retain evidence and an original URL.

Read `references/batch-schema.md` before creating a batch and `references/discovery-results.md` before recording discovery. For product policy, also read `docs/AGENTIC_UPDATES.md` and `docs/PRODUCT_DESIGN.md` in the repository.

## Choose scope

- `cycle`: default for scheduled and unattended work. Finish registered-source synchronization, then continue all currently due discovery until the cycle converges.
- `incremental`: explicitly source-only. Check registered sources and process pending diffs without broad discovery.
- `discovery`: explicitly search-only. Find missing official/cast accounts, work-specific cast posts, creator art, original fanworks, or community threads. Birthday research is excluded unless the user explicitly requests a birthday audit.
- `rapid`: one-off check scoped to a work, episode, broadcast, or event. Do not turn it into a permanent high-frequency loop.
- `repair`: revisit a known conflict or incomplete entity and cite the conflicting observations.

## Agentic cycle

For scheduled and unattended work, one wake is one continuous cycle, not one tiny batch:

1. Finish `.research-cache/pending-diff.json` first when it exists; otherwise run `bun run research:diff`.
2. Process, import, and commit every real source change. Source errors block only the affected source; record them and continue unrelated sources and discovery. Only a global credential or configuration failure blocks the whole cycle.
3. Inspect `bun run research:discover:status`. Resume an active campaign, or run `bun run research:discover` when no active due campaign exists. The planner must load database resources and durable search memory first, and must not schedule a target already satisfied by a verified record or an exhausted audit. Use `--replace` only for an explicit scope refresh and `--force` only for an explicitly requested whole-season audit.
4. Prioritize an explicitly requested platform or scope. Lease with `bun run research:discover:next -- --platform=X,Instagram` when those platforms are requested; otherwise lease currently due work. A positional batch size may fit the remaining execution window, but there is no fixed query quota and the lease is only overlap and crash protection.
5. Execute, verify originals, record results promptly, and import verified candidates. A zero-hit result is normal durable progress.
6. Repeat leasing and recording until no matching due work remains, a true global blocker appears, or the execution window ends. Persist partial progress so the next wake resumes without a person supervising it.

## Discovery workflow

Discovery searches for unknown sources; it is separate from registered-source synchronization but may run in the same agentic cycle.

1. Run `bun run research:discover:status`, then resume the active campaign or create one with `bun run research:discover` when needed. Before planning searches, treat verified database resources, registered canonical URLs, and durable `exhausted` memory as satisfied. Do not browse again merely because a field is part of the discovery catalog. Only an explicit user scope or `--force` may override this satisfaction check.
2. Lease matching due work with `bun run research:discover:next`. For explicit platform work use `--platform=X,Instagram`; `--kind=<comma-separated kinds>` can narrow a search lane. A smaller positional size is allowed only to fit the actual execution window; after recording it, lease again until the due scope converges.
3. Execute only leased queries and reuse `knownHits`. Preserve the query context in every result: `contentLane`, `animeId`, `personId`, `characterIds`, `accountId`, and `platform` when supplied.
4. Treat search results as leads. Open the original page and verify identity, entity match, date, authorship, and original-post status. Never turn a snippet into an observation.
5. Record every executed query, including zero-hit and blocked searches, using `references/discovery-results.md`, then run `bun run research:discover:record -- <results.json>` promptly.
6. Put verified candidates into traceable batches. Keep extraction and review as separate passes and import through the normal batch workflow.

Routine discovery never schedules character birthdays. Use `bun run research:discover -- --audit-birthdays` only for an explicitly requested birthday audit. A verified birthday or an exhausted first-party audit satisfies that target; do not put it back on a timer. Re-run it only when the user explicitly asks or a relevant first-party source materially changes.

Login, CAPTCHA, or platform failure blocks only that platform; continue public and unrelated work. Result-file chunk size and lease size are implementation details, never stop conditions.

For an explicitly requested whole-season social audit, inspect each work's verified official account first. When deduplication leaves no new high-value item, inspect a bounded set of verified original-creator and main-cast accounts before recording a zero-hit result. Do not duplicate an official announcement merely because a creator or cast member quoted it; keep the post only when their own text contributes material firsthand context, such as an interview, production note, episode response, or project activity.

If a leased scope disappears before search, run `bun run research:discover:cancel -- <scope-type> <scope-id> <reason>`. For a full registered-source baseline use `bun run research:sync:full`; this is sync, not discovery.

## Incremental workflow

1. Set `YURI_RADAR_URL` and `YURI_ADMIN_TOKEN` locally. Never print either value. When production Admin is protected by Cloudflare Access, also set `YURI_ACCESS_CLIENT_ID` and `YURI_ACCESS_CLIENT_SECRET` for one app-scoped Service Auth policy that includes only the named research service token. Access and Worker token checks are independent. Do not rotate the production `ADMIN_TOKEN` merely because a new local value exists; first reuse the matching operator credential or obtain explicit approval for a production secret change.
2. Run `bun run research:diff`. It writes `.research-cache/pending-diff.json` only for changed item hashes.
3. If there are zero changes, record source errors and return to the agentic cycle. Do not browse broadly in explicitly source-only `incremental` mode.
4. Reconcile `catalogChanges` as structured metadata; never turn them directly into feed candidates. Only `feedChanges` enter extraction and review.
5. Extract atomic claims and match registered anime/person/character/account IDs. Do not infer identity from names alone.
6. Review relevance, entailment, duplicate risk, source identity, safety, spoilers, attribution, and presentation separately from extraction.
7. Create one JSON file in `research-batches/`, following `references/batch-schema.md`.
   Before import, preflight every user-facing candidate: `title` and `summary` must be concise Chinese by default, while preserving necessary official proper nouns. Do not use English fallback copy merely to satisfy validation; stop and correct it before import.
8. Run `bun run research:import -- <batch.json>`. The server may downgrade `publish` to `hold`; never bypass policy.
9. After successful or duplicate-safe import run `bun run research:commit`. Keep the pending diff when import fails.

After importing a real change, reconcile its impact before declaring it complete. Derive the affected domain objects from the observation, load their current structured state, fill every supported missing or stale projection, and verify the reader-facing result. A Feed item alone never completes a change that also affects resources such as events, theme songs, media, accounts, cast, or schedule. Prefer deterministic reconciliation scripts and invariants over adding event-specific instructions to this skill; leave unsupported fields empty instead of guessing.

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

### Official X and tag lane

- Treat every verified current-season work/project X account as a recurring one-day local update target. Inspect the account's complete original-post timeline incrementally from the previous checked time; do not reduce official monitoring to a search-engine query containing one title spelling.
- In parallel, run one daily newest-first X tag sweep per current-season work that has a verified official X identity. Recover active official work, anime, project, and campaign hashtags from the verified profile and recent official originals, then expand with the work's Chinese/Japanese/English aliases, project nickname, recurring protagonist names, and recognizable protagonist-pair or unit names. Do not hard-code one season's tags into this skill.
- Account timelines and tag sweeps are complementary discovery surfaces. Before opening a result, merge their database publications and durable `knownHits`; after opening it, persist the stable post ID with `published`, `held`, `rejected`, or `ignored` so the same post is not reconsidered through another tag or account query.
- Open every tag hit at its original URL and classify it by actual provenance. An official-account post stays official; a verified member/cast/creator original uses that lane; community commentary remains a lead and cannot inherit official trust from the hashtag.
- When the signed-in Chrome X search surface is unavailable, the public X embedded profile timeline may be used as a read-only fallback for verified official accounts and already-registered verified creator/cast/member accounts. This fallback can recover current tags and stable original-post IDs, but it is not a substitute for the global newest-first tag timeline. Persist the partial hits and registered-account zero hits with an explicit surface note, keep the one-day cadence, and retry the global tag surface later; never report the fallback as an exhaustive all-X zero result.
- A third-party X metadata adapter such as FxEmbed may be used only after the canonical X original has already been opened or independently recovered from X's public embed data, and only to extract the upstream `pbs.twimg.com` media URL, dimensions, or stable quoted-original relationship. It is a transport aid, never provenance: candidates, creator attribution, text, dates, tags, rights checks, and canonical URLs must remain anchored to the original X post and verified account evidence.
- One original may produce multiple linked outputs. When an official post announces an event and includes an actual visual, create the feed candidate, the structured event/calendar record, and the media record together when each is supported. A visible image is not decorative evidence to discard.
- For media reuse, inspect the original post, account profile, and any linked official detail or rights page. If any of them explicitly prohibits reproduction, reposting, mirroring, or embedding, keep the media `link_only` without a cached preview even when the image bytes are technically downloadable.

### Voice actor lane

Model cast content as:

`character → cast credit → person → verified account → work-specific original post`

- Discover X and Instagram identities independently. A person with verified X may still need Instagram discovery.
- Routine account discovery is intentionally narrow: cover original authors/artists and the recurring protagonist cast. Do not fan out across every production staff credit or supporting/episode-only cast member. Search those people only for an explicit forced identity audit or when a concrete work-related post creates a new lead.
- Account discovery is not account verification. Store a proposed `account_identity` claim and an unverified local account; a human or first-party cross-link must verify it later. Once an owner/platform account exists in the database, ordinary discovery treats that target as covered even while verification is pending. Reopen identity discovery only for an explicit forced recheck; verification and conflict repair are separate work queues.
- A `cast_post` observation uses the verified account itself as provenance and supplies `animeId`, `personId`, `accountId`, optional `characterId`, and stable `platformObjectId`.
- For an ordinary voice actor, the post must explicitly mention the work, character, episode, or relevant event. A generic actor update is not a candidate.
- For a 2.5D project, a verified main-group project-member or project-persona account may also contribute the member's public professional or creative activity even when the anime title or project marker is absent. Require first-party evidence that maps the account to the project. Eligible activity includes performances, tours, public appearances, release events, interviews, meet-and-greets, rehearsals, behind-the-scenes work, official streams, and the member's own credited creative output. Exclude purely private routine, context-free selfies, unrelated advertising or giveaways, and repost-only items with no material first-hand comment.
- Treat verified main-group 2.5D member/persona accounts as recurring local update targets while the project is in the current season. Inspect the account timeline incrementally from the previous checked time at a one-day cadence, rather than requiring a search-engine title match. Preserve every seen stable post ID in durable search memory so accepted, rejected, and ignored posts are not reconsidered. An explicit anime/work tag is sufficient work linkage and must not be missed merely because the planner searched a different romanized title.
- When an eligible 2.5D member post visibly contains an original image or official preview, create a linked media record so it appears in the work's image section as well as the feed. Keep `media.originalUrl` on the original post. For a verified official, creator, cast, or project-member account, the site may cache the exact public image bytes under the scoped `yuri/` R2 prefix when neither the post, profile, nor linked source page explicitly prohibits reposting, mirroring, or embedding. Preserve creator attribution, the upstream image URL and hash in evidence, a rights note explaining the no-prohibition check, and the correction/takedown path. This default does not extend to community fanwork, which remains `link_only` without affirmative reuse permission.
- The importer validates the cast credit, account ownership, verification state, and post URL. It derives `sourceIdentity: cast`; do not rely on batch text to assert that identity.
- Keep cast posts in their own deduplication lane: anime + account + platform object ID. Do not merge them with ordinary official updates merely because the URLs or titles look similar.

### Fanwork lane

Model fanwork as:

`anime → original creator → original creator post → reviewed link-only candidate`

- Search Pixiv, X, and Instagram separately. Use only the original creator post, never an aggregator, mirror, quote-post, or repost.
- Pixiv is the primary channel and has a public tag-search endpoint that works without login: `https://www.pixiv.net/ajax/search/artworks/<tag>?word=<tag>&order=date_d&mode=safe&s_mode=s_tag`. Search by the native work title and main-character names, newest first; record every seen artwork ID as a hit so later runs only surface new works; open the artwork page before building a candidate to confirm creator, title, rating, and date.
- AI-generated fanwork is out of scope and must be excluded before batch creation. For Pixiv, inspect the original artwork detail response for the platform's dedicated AI-generated-work status as well as the complete tag list and caption. A positive platform status/label or an explicit generation disclosure such as `AI-generated`, a localized equivalent, `NovelAI`, or `Stable Diffusion` is a hard reject; tags are an exclusion signal, not proof of human authorship when absent.
- Require the platform AI status to be explicitly non-AI before accepting a Pixiv fanwork. Do not guess undocumented numeric enum meanings, infer authorship from visual style, or treat a missing AI tag as sufficient. If the status cannot be read, record the query as `blocked`; if the status conflicts with the tags, caption, creator profile, or another explicit disclosure, record the artwork hit with outcome `rejected`. In either case create no candidate.
- Apply the same exclusion to other platforms when the original post, creator profile, platform label, tags, or caption explicitly discloses generative-AI production. Record excluded artwork IDs/URLs as rejected discovery hits so they are not surfaced again, but do not put them into a research batch as an observation, candidate, or media item.
- X guest hashtag search is unavailable. Discover X fanart only through known creators already in search memory (`knownHits`) or an existing signed-in browser.
- Instagram fanart requires a signed-in browser; record `blocked` instead of inventing leads when one is unavailable.
- Supply the creator name, optional creator profile URL, original post URL, media class, safety, spoiler level, and rights note where known.
- Candidate URL and `media.originalUrl` must be the same canonical original post.
- Fanwork is always `link_only`, `sourceIdentity: community`, and `hold` in phase one—even when the creator identity and post are verified.
- Deduplicate fanwork in its own lane by stable platform object/original URL. Do not collapse it into cast, creator-art, or official lanes.

## Operational self-iteration

Treat running the 百合季 site as a feedback loop for this skill, not as a sequence of isolated fixes.

1. During every operational run, note any newly discovered rule that would prevent the same class of error, improve traceability, or make a repeatable task safer or more deterministic.
2. Before finishing the run, decide whether the lesson is reusable. Promote only stable workflow, validation, provenance, safety, or presentation rules; do not embed one-off records, transient URLs, secrets, unverified guesses, or work-specific facts that belong in the database or a research batch.
3. Update the canonical repository skill at `.agent/skills/yuri-season-research/SKILL.md` in the same operational turn. Do not create a second project-local copy; the canonical directory is the publication and maintenance source.
4. Validate the complete canonical skill after editing and inspect the diff. A skill change is incomplete if validation fails, it contradicts existing safety or publishing boundaries, or it silently broadens authorization.
5. In the handoff, state the reusable rule learned and how it changed the operation when the change was material. Continue the active research/import workflow after the skill update; do not let skill maintenance replace the requested site work.

## Other research rules

- Official facts: use the official site/account, publisher, broadcaster, or an API entry cross-checked with an official source.
- Main-character coverage means the recurring protagonist group, not every entry on an official character or cast page. Use the official story, key visual, character grouping and cast prominence together; exclude managers, relatives, mentors, rival teams and episode-only guests unless the work consistently treats them as part of the central ensemble.
- For every in-season work, record the expected main-group count, the official page used to establish it and the time checked. Keep supporting-character records when already present, but mark them outside the main group so they remain editable in Admin without appearing in the public main cast or completeness score.
- Use the official native name as the identity anchor. A Chinese display name may be aligned to Moegirl only when an explicit one-to-one character or person match exists; record the exact Moegirl page as translation provenance. If no reliable match exists, preserve the native name or an already verified official Chinese name. Never invent a transliteration to make coverage look complete.
- Moegirl is a translation reference only. It cannot verify cast identity, character profile, birthday, social-account ownership or main-group membership; those still require first-party evidence. Recheck the main-group baseline when a new season is onboarded or the official character page materially changes.
- Staff/creator posts: require a verified or officially linked account and an explicit work/character/episode/event reference.
- For virtual bands, performers, or project personas, check the project owner's first-party launch announcement or press release when a current member page hides social links behind client-side rendering or has been reorganized. A first-party release that explicitly maps each member name to an account can verify those individual identities; never substitute the group account for a member account. If later first-party evidence contradicts a recorded zero-hit result, import the correction and note it explicitly instead of preserving stale search memory as fact.
- Character birthdays: require a first-party profile, calendar, publisher material, or equivalent official source. Fan wikis are leads only.
- Birthdays are character records and calendar events only. Never create a `birthday` feed candidate; a verified birthday updates the character record and its yearly calendar event, nothing in the feed. Birthday-related celebration content (official birthday art, creator art, cast birthday posts) enters the feed through the `official_art` / `creator_art` / `cast_post` lanes, each with its own provenance, safety, spoiler and deduplication rules.
- A full main-group birthday audit must execute exact-name searches across the work's official character/news pages, publisher or game first-party material, and indexed original posts from the official work/creator account. Run it only when explicitly requested, using `bun run research:discover -- --audit-birthdays`. After completing the audit, run `bun run research:audit:birthdays` so every main character receives durable search memory. Verified dates retain the exact first-party page; zero-hit records are marked exhausted with `rerunOn: first_party_source_change` and must not be polled again on a timer. Never promote a search-engine summary when its original official post cannot be opened, and never substitute a real ship's launch date for a character birthday.
- Episode progress has two layers. Until a first-party episode record is captured, estimate the aired episode from the primary broadcast premiere, weekly cadence, total episode cap and any explicitly documented multi-episode premiere. When an official STORY, broadcaster or distribution page confirms an episode after its release time, persist `latestVerifiedEpisode`, `latestEpisodeSourceUrl` and `latestEpisodeCheckedAt`; that verified value overrides the estimate. Never advance from an unreleased preview alone.
- Creator art: preserve creator name and original post. A page that only says a product/event will include a newly drawn illustration does not prove that the image has been published; keep it as an official-news lead or reject it from the art lane. Publish a creator-art item only after opening the original page/post and confirming that the actual image or a viewable official preview is present.
- When the original page exposes an actual image or official preview, add a linked `media` record as well as the feed candidate so the work page can show it in the art/fanwork gallery. Preserve the original page as `media.originalUrl`. When caching is permitted and the image is verified safe, store the exact fetched bytes under the scoped `yuri/` prefix in the existing R2 bucket and use `https://r2.i-yuri.com/<key>` as `media.previewUrl` with `remote_preview`; retain creator attribution, the upstream image URL in evidence metadata, correction notices, safety, spoilers, and a rights/provenance note. Never upload a placeholder, `NOW PRINTING` image, search thumbnail, an image whose original page cannot be verified, or any image whose source explicitly prohibits redistribution, reposting, or embedding; keep those entries `link_only`. If no actual image is available, omit `media` and do not title the item as though viewers can see the artwork.
- Theme songs: follow the first-party identity, classification, conflict, and licensed-platform projection rules in `references/batch-schema.md`. Run `bun run research:music:apple-covers` after a release-related change, inspect the dry-run, then use `--apply`; it must resolve exact title-and-artist Apple matches, complete the action and artwork together, and refuse missing or ambiguous matches.
- Community threads: query database discussions, canonical URLs, and `knownHits` before browsing; skip already registered threads unless the user explicitly requests a recheck. Store title, URL, platform, and recent activity only. Do not copy bodies. Use `《作品名》动画讨论专楼` only for a work-specific thread. For a seasonal or platform-wide comprehensive thread, use a broad season/platform title and never disguise it as one work's dedicated thread.
- For 百合会, do one season-level incremental sweep of the signed-in 动漫区 recent-thread list at `https://bbs.yamibo.com/forum-5-1.html`. Compare thread IDs and canonical URLs with the database and `knownHits`, then match new or newly active titles against every current-season work's Chinese/Japanese/English titles, project nicknames, character names, and recognizable pair/ship names. Do not rely only on search-engine indexing, exact quoted titles, or `专楼/集中讨论` terms: relevant topical, character, pairing, production, and fan-creation threads are valid leads. Keep stable dedicated threads and materially popular relevant discussions; treat a board hot marker, roughly 10 or more replies, roughly 500 or more views, or sustained recent activity as evidence of material discussion rather than a rigid quota. Open each matched original thread before recording it; exclude generic chatter and one-line reactions. A link-only thread may be imported and published automatically when the original thread was opened, the work/character/pairing match is unambiguous, no body or attachment is copied, safety is `safe`, spoiler is not `major`, confidence is at least 0.92, and at least one of those activity signals is present. Manual review remains for ambiguous linkage, identity conflicts, unsafe/major-spoiler material, or missing original-page evidence.
- Model one cross-work thread as one canonical candidate. Set `animeId` to one covered anchor work and `animeIds` to every materially covered work; never duplicate the candidate once per anime. For a comprehensive thread such as 百合会综合讨论, start from the current-season catalog, include the covered majority in one operation, then remove the few unsupported exceptions. Keep one canonical URL even when it appears on many work pages. See `references/batch-schema.md` for the candidate shape.
- Treat 萌战吧 as a separate discussion source from a work's own Tieba. It may contribute a sustained work review, episode discussion, character poll thread, or seasonal cross-work discussion when the original thread is accessible and materially covers the linked work. Store the platform exactly as `萌战吧`; exclude one-line reactions, pure image/meme posts, bait, search snippets and unrelated popularity contests. Reuse one cross-work thread through the canonical URL instead of duplicating it per anime.
- X and login-gated platforms: use an existing signed-in browser only when allowed. Do not scrape at scale or evade rate limits.

## Review boundaries

Recommend automatic publish only when all are true:

- source is `official` or `verified_creator` (verified cast posts are evaluated by server policy in their cast lane);
- evidence directly entails title and summary;
- safety is `safe`, spoiler is not `major`, and presentation is `link_only`;
- confidence is at least 0.88 for official or 0.92 for verified creator;
- item is not fanwork, a birthday feed item, or a new account identity. A deterministic link-only community thread may auto-publish under the stricter 百合会 rule above.

Otherwise use `hold`. Use `reject` for irrelevant, duplicate, contradicted, unsafe, or provenance-free material.

## Stop conditions

- A scheduled `cycle` stops only when current due work has converged, a true global credential/configuration blocker prevents all useful work, or the execution window ends after durable progress is saved.
- Never use a fixed query count, result-file size, or lease size as a reason to stop while relevant due work remains.
- Login, CAPTCHA, extensive JavaScript, or a platform outage blocks that platform only. Continue other sources and notify only when human login/action is genuinely required or the failure repeats.
- Do not perform an all-season web search during explicitly source-only `incremental` or narrowly scoped `rapid` mode.
