# Routine update policy

Use this policy for ordinary website updates: fixed coverage, related evidence checks, and bounded editorial searches. Routine does not reopen open-ended Discovery.

## Watchlist boundary

- Check every due enabled registered official site, NEWS page, and first-party feed/API through the source-diff workflow. Catalog, community, and unverified sources stay outside routine even when they are registered.
- After source changes are resolved, incrementally inspect every due already verified, enabled X/Twitter account linked to a tracked work and requiring local monitoring. This includes project/official accounts, cast accounts, original authors and other credited creators, and credited production staff such as directors, writers, designers, and animators. Use the committed platform cursor or prior check time; do not reread pre-cursor history.
- Treat these account groups as separate first-class editorial lanes. Do not omit cast, original-creator, or production-staff accounts merely because the work has an active official account or because those people post relevant material less frequently. Scheduling may vary by role, recent yield, and event proximity, but every due enabled account remains part of routine coverage.
- Do not run season-catalog searches, missing-source searches, account discovery or verification, X tag searches, Instagram, Pixiv, fanwork, community, birthday, or missing-metadata research in `routine`. Those require an explicit profile or audit.
- A verified non-X account is not part of routine local-browser monitoring unless its content arrives through an enabled registered source. A user may explicitly request another platform through the relevant audit or Discovery profile.

## Editorial workflow

- Prioritize reader-impacting changes: broadcast/distribution changes; PV, KV, and official visuals; cast appearances and commentary; original-author/creator art or statements; production-staff drawings, process notes, and credited work; events and ticketed/streamed appearances; music; then other concrete first-party updates.
- Person-account inclusion is post-specific, not all-or-nothing. Inspect the due timeline completely, record every stable original ID required by the cursor contract, and publish only posts with an explicit relationship to the tracked work, its characters, episodes, events, or credited production work. Purely private routine, unrelated promotions, giveaways, and repost-only items are ignored rather than used to exclude the account from future checks.
- Cluster multiple posts about the same announcement or event. A reminder, ticket phase, start notice, and result update enrich one event identity unless they add independently useful reader information.
- One source observation may support Feed, media, events, schedule, accounts, cast, or music. Reconcile every projection directly supported by the evidence; a Feed card alone is not completion.
- Follow links needed to understand the current update: interview pages and pagination, quoted originals, galleries, and event details are routine evidence checks even on previously unregistered sites. A cast member sharing an interview is a lead to read the interview, not merely a repost to summarize or ignore. New accounts and tags remain leads; reading a linked original does not enroll its author in the watchlist.

## Bounded editorial judgment

- At the start of a run, read `.research-cache/routine-editorial.md` if present and resume due unfinished leads alongside fixed coverage. Keep this one short local handoff file: source URL, related work, last check, finding or blocker, next concrete step and revisit time. Retain unresolved leads and recent completed/zero-result searches to avoid repeating them; do not delete it with temporary batch files.
- After mandatory coverage and publishable candidates are handled, choose timely questions about tracked works from recent developments or information gaps. Search for interviews, production commentary, or event reports using terms and sources suited to the question. Registration is not a prerequisite for inspecting an original; publication still requires verified provenance and normal review.
- Use roughly 20% of the run window as a starting ceiling for proactive searches, shortened when coverage or publication needs the time. Set a concrete time limit before searching. No query, work, or publication quota is required; record a short reason if there is no useful question or remaining time.
- Follow a lead while it is directly relevant, adds uncollected information, and the next step is likely to produce original evidence. Read necessary pagination; stop on repetition, unrelated recommendations, or the time limit rather than a fixed hop count. A fetch failure calls for the applicable browser fallback; platform rate limits still stop that platform.
- Import verified material through the existing observation/candidate batch workflow. Keep the referring post and linked article as separate evidence with their own URLs, identities, and dates; external pages must not count as inspected posts in a timeline result. Record editorial progress in the handoff file, not by inventing leased query IDs or overwriting timeline cursors.
- Before ending, resolve valuable in-scope leads or checkpoint their exact remaining work and revisit time. CLI `finish` checks planned coverage, not this editorial handoff. An unread continuation or an unprocessed publishable candidate is incomplete work; an optional search deferred by budget may carry over without blocking otherwise completed coverage.

## Official-site and X media

- Inspect the opened original for images, galleries, video previews, and other visible media. Do not assume that a page or post is text-only because the source diff contains only text.
- For a published official-site or X update with media and no explicit prohibition on redistribution, rehosting, or embedding, retrieve the actual source asset, upload it to remote production storage, create the linked media/assets, and pass the public readback checks in `publication-policy.md`.
- Missing R2 access, failed upload, importer defaults, or implementation inconvenience means the item is held or incomplete. It never justifies publishing a text-only update or using `link_only_policy`.

## Completion handoff

- Report registered sources checked and verified X coverage by lane—official/project, cast, original creator, and production staff—plus published/held updates, changed structured resources, blocked surfaces, and next scheduled checks. Include editorial findings and any concrete deferred leads in the handoff.
- A verified zero-change result is normal. Routine is complete when every due watchlist task has passed its completion policy, every published projection has been read back, and the editorial handoff above is satisfied; unrequested Discovery gaps do not appear as pending work.
