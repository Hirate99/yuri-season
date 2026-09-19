# Routine editorial work

Routine combines complete due-source coverage with autonomous discovery and publication. The watchlist is a coverage floor, not the boundary of reporting. Choose the order of coverage, discovery, and publication while remaining responsible for all due coverage and qualified candidates.

## Fixed coverage

- Process every due enabled registered official site, NEWS page, and first-party feed/API; open changed originals rather than relying on diff text.
- Inspect all due verified, enabled X accounts in four equal lanes: official/project, cast, original authors/creators, and production staff. Judge posts individually for their relationship to tracked works; low yield does not remove accounts from coverage.
- Use the committed cursor. Record each inspected original's stable ID and disposition, including ignored/rejected posts. Only reaching the previous cursor permits completion and advancement; an initial scan covers the previous 30 days. Save `resumeCursor` for partial scans. External articles and search snippets are not timeline evidence.
- When one X account appears under several works, inspect its timeline once through the oldest required boundary and reuse the captured evidence. Judge and record each work's relevance separately; do not reopen the same account for every source row.
- Recheck completely inspected X accounts after 3 hours. The recorder computes the interval; do not choose a next-check date or schedule reason. All accounts remain visible in context. A recent check avoids redundant scanning but does not prevent following a new original, an event lead, or unfinished publication. Partial and blocked coverage remains unresolved; platform Retry-After still takes precedence.

## Autonomous discovery

Choose promising questions about tracked works from recent developments and information gaps. Search for interviews, production discussions, creator output, and substantive event reporting. Follow originals, quoted posts, galleries, and necessary pagination while they add relevant evidence. Unregistered sites and unfamiliar accounts may supply verified story evidence without being enrolled in monitoring.

Discovery can happen alongside fixed coverage, without separate permission or a `discovery` campaign. Avoid repeating recent completed or zero-result searches. Stop searching when a lead becomes repetitive, irrelevant, or unlikely to yield evidence; prioritize ready publication and overdue coverage over speculative searches. Honor user-specified search budgets. Otherwise bound optional search sessions without treating that limit as a deadline for mandatory coverage or qualified publication. Explain briefly when no worthwhile question exists; there is no search or publication quota.

Use signed-in X search with evidenced official tags, work names, and confirmed aliases to find official, creator, and fanwork posts beyond the watchlist. Choose searches from recent episodes, events, visuals, and information gaps; do not exhaust every tag each run. Verify the original author and stable post ID, deduplicate before further work, and apply the relevant sections of `research-policy.md`. A tag does not establish official identity. Record query, check time, inspected results, findings, and next action in existing editorial evidence; search sessions need not exhaust X and never substitute for timeline coverage. Resolve every qualified candidate actually found.

Bulk account enrollment, season-wide catalog audits, Pixiv/Instagram discovery, broad cross-work fanwork/community sweeps, and birthday audits remain separate assignments. Opening a relevant original and checking its authorship for a story is not bulk account discovery.

## Editorial judgment

Publish concrete reader value: schedule/distribution changes, PV/KV and new visuals, manga chapters, creator art and process notes, work-related cast commentary/interviews, credited staff work, events, music, and substantive merchandise news. Short captions can accompany meaningful visual storytelling; inspect media and quoted originals.

For each relevant original, decide independently whether readers need a Feed update and whether its facts require an event, schedule, music, or other resource update. Attendance/viewing times and appearances trigger the event-policy check, not automatic event creation. A repeated reminder or already-published story may still fill a missing calendar entry or correct its time, access, participants, or status. Check the actual existing resource before concluding it is covered. Record the resource ID and action, or a brief not-applicable/unresolved reason in existing item evidence; no separate ledger or new schema is needed.

Ignore unrelated private activity and giveaways. Skip pure reposts and repetitive reminders as new Feed cards after resolving any relevant structured facts. Merge announcements of the same content through existing corrections, preserving source identity and dates. An interview is the story, with its referring post retained as discovery evidence. Apply [publication-policy.md](publication-policy.md) for copy, media, and verification; editorial review is the agent's responsibility.

Decide from each original's actual text, images, and quoted source before generating submission JSON. Builders may serialize those decisions, but must not default every hit to `ignored` or infer Feed rejection from the presence of an event ID. A merge names the existing matching publication; resource coverage names the matching resource and supported facts. Shared reasons are appropriate only for originals individually verified to belong to the same repetitive cluster. Unresolved originals remain work to adjudicate, not generic reminders.

## Browser access

For X use a signed-in original timeline and one dedicated research tab. Read the browser-control skill. Use the in-app browser first; Chrome is a fallback for a demonstrable browser/login problem, not a way around suspected throttling. Do not take over unrelated tabs.

Pace X throughout the run, including successful browsing. Keep all X navigation, search, original-post opens and timeline loading sequential; do not parallelize them across tabs, browsers or agents. Allow at least 10 seconds between network-triggering navigations/searches/post opens, and at least 5 seconds between scrolls that load more posts. Wait longer when loading is slow. Read and adjudicate the loaded material before requesting the next page; reuse already visible originals instead of reopening or refreshing them. These are conservative local operating intervals, not documented X limits or a guarantee against throttling.

Treat a rendered “Something went wrong” or equivalent generic loading failure as possible throttling even without HTTP 429 or Retry-After. Their absence does not establish that requests are safe to continue. Inspect the current URL, login state and screenshot without reloading to distinguish an obvious login/browser problem; otherwise pause X requests for at least 5 minutes. Do not immediately refresh, test another account, change queries or switch browsers. During the pause, process captured evidence, official sites, ready publications and resources.

After the pause, make one recovery attempt in the same research tab. If the same error recurs, stop X for at least 30 minutes and preserve the actual resume point. Further failed recovery attempts extend the pause; do not repeat a short retry loop. Record this as suspected throttling, not confirmed HTTP 429. On explicit 429 or a platform rate-limit notice, honor Retry-After; when no retry time is supplied, wait at least 30 minutes before one recovery attempt. Never rotate accounts, sessions or browsers to evade a limit.

Save the error, observation time, last real post/cursor, attempted recovery and earliest retry time in existing editorial evidence. A new run does not reset the pause. Once it expires, verify recovery once and resume slowly if successful. A successful page does not justify a burst of queued requests. Recheck a user-reported recovery without overriding an active server-enforced cooldown. Keep the ordinary 3-hour source recheck interval separate from access backoff, and continue unaffected editorial work.

Keep access status and editorial disposition separate: an inaccessible source is blocked/partial, never ignored or a zero-result check. Preserve each task's actual progress; do not assign all unvisited accounts the failure of one account or invent resume cursors. Record attempted URL, time, browser surface, observed error, recovery attempts, and the real last inspected ID/cursor. Report unvisited tasks as pending, and report uninspected creator output as unverified rather than “no new art”.

## CLI operations

Routine has three commands, used independently:

| Action | Operation |
| --- | --- |
| Read tracked works, all verified X sources, cursors, recent publications/searches and unresolved evidence | `bun run research -- context` |
| Check registered official sources and retain unresolved changes | `bun run research -- sources` |
| Save inspected timeline evidence and synchronize existing search memory | `bun run research -- record <observations.json>` |

The context is an editorial briefing, not a list of permitted searches. Choose original sources, work names, verified tags, interviews and quoted chains yourself; keep exploratory query/result notes in the existing editorial journal. `needsCheck` uses the fixed 3-hour interval, not stored legacy next-search dates. No campaign, lease or finish command is needed for routine. Neither an empty change list nor recent source checks establish editorial completion.

Use the documented importer/Admin APIs for publications and resources. Website changes remain in `.research-cache/pending-diff.json` with version-specific `changeId` values. After Feed/resource decisions and public readbacks, run `bun run research:commit <resolutions.json>` with `{ "resolutions": [{ "changeId": "<exact changeId>", "outcome": "published", "reason": "<item-specific decision>", "evidenceUrls": ["<public readback URL>"] }] }`. Outcomes are `published`, `covered`, or `ignored`; published/covered require evidence URLs. Leave blocked versions unresolved.

See [discovery-results.md](discovery-results.md#routine-observations) for the small observation format. `record` validates and archives evidence before writing production memory. On an allowed retry, pass the original input or the saved `pendingEvidence` file to the same command; it reuses original inspection timestamps. A record receipt proves memory synchronization, not publication.

Context lists every unresolved memory hit as a brief lead; it does not establish that the story is still unpublished. Reconcile against production before preparing content. Use `context --details` when full historical text, media evidence or legacy cursors are needed. Original memory IDs and URLs remain available in the brief output.

Existing `update-plan.json` evidence is preserved. If context reports `legacyAwaitingSync`, replay it with `bun scripts/discovery-campaign.ts record --profile=routine`; `legacyUnfinished` identifies historical unfinished sources, not active leases or new tasks. Read their saved boundaries with `context --details` when resuming. Do not create or replace routine campaigns. Explicit discovery/account audits retain `scripts/full-discovery.ts` and `scripts/discovery-campaign.ts`.

## Operation failures and resumption

- Retain original URLs, source IDs, inspection timestamps, real resume cursors and unsynchronized evidence. Continue reading and publishing independently of memory synchronization.
- For an approval rejection, preserve the exact rejected operation and stated reason. Compare the original post ID, text, media, proposed resource relationships, and submitted payload with the evidence. Correct local factual or payload defects first. Retry through the normal reviewed path only when allowed and supported by corrected evidence or changed authorization; never disguise the same rejected operation or switch write channels to bypass review. Do not call a rejection a reviewer mistake without inspecting its actual reason and your own input.
- Existing editorial authorization remains valid. Ask for user input only when a concrete unresolved authorization or material decision actually requires it, stating what remains missing. A rejected import does not automatically block other sources, preparation, or unrelated authorized writes; determine its actual scope and continue unaffected work.
- Goal-tool blocked thresholds are necessary conditions, not a reason to manufacture repeated audit turns. Mark blocked only under the tool's rules and when no mandatory work can meaningfully advance. A checkpoint, unchanged counter, or missing browser handle alone does not establish that condition.

## Handoff and completion

Read `.research-cache/routine-editorial.md` at the start and maintain it at the end: URL, related work, last check, finding/blocker, next action, and revisit time. Retain unresolved leads and recent completed/zero-result searches. Exploratory searches need no generated task IDs and must not alter account timeline cursors.

Keep one current recovery summary at the top and update it in place; do not prepend another "current" summary each turn. Archive detailed run evidence under existing routine reports and link it from the summary. Distinguish observed coverage, successfully synchronized coverage, published items/resources, and unresolved work with their last verification times. A prior "all work exhausted" conclusion expires when sources become due or new originals appear. Automation memory should point to this summary and avoid duplicating its full history. Read history selectively for unresolved IDs or evidence.

Reconcile candidates from this run's discovery results and carried-over unfinished evidence, including candidates never imported into Admin. The Admin held list alone is not the full queue. Match stable original URLs/post IDs against production Feed and the work's media collection; check semantic duplicates before creating a new item. Close a qualified item only with its public Feed ID/link and required media/resource readback. Otherwise complete the existing candidate or repair the existing publication, or retain a concrete blocker and next action. Record a reason for an editorial rejection rather than silently dropping the item.

The committed cursor bounds new timeline discovery, not publication eligibility. A candidate at or below it still needs publication reconciliation; `seen`, `candidate`, and recorded coverage do not prove publication. Continue known unfinished items even when their account is not due. Scoped missing-image repairs may revisit older originals without resetting or advancing discovery cursors. Recently checked accounts do not close unfinished publication work.

Completion requires all due coverage to pass and every relevant original's Feed and structured-resource decisions to be resolved. Reconcile this run's time-bearing sources against actual event/schedule records, including sources ignored as duplicate Feed content; verify required resources in Admin and their public projections. Checking only resources already written, or receiving HTTP 200 from a related endpoint, does not establish that nothing is missing. Qualified publications, required reading, and projection repairs must also be complete. Optional speculative leads can carry over. Actual blockers follow the main Skill's stopping rule.

Report source counts/changes; X due, complete, partial/blocked counts by lane; new public links; merges/ignores; discoveries and deferred leads; blocker/resume evidence; and Feed/detail, structured-resource, and media verification. Reverify changed/new publications and their assets; do not repeatedly download unchanged, previously verified media to substitute for discovery. Honor user-designated priority accounts and report cursor, findings, and last actual inspection time even within the 3-hour interval. A quiet zero-change outcome is valid only after full coverage and adjudication establish no qualified new content.
