# Routine editorial work

Routine combines complete due-source coverage with autonomous discovery and publication. The watchlist is a coverage floor, not the boundary of reporting. Choose the order of coverage, discovery, and publication while remaining responsible for all due coverage and qualified candidates.

## Fixed coverage

- Process every due enabled registered official site, NEWS page, and first-party feed/API; open changed originals rather than relying on diff text.
- Inspect all due verified, enabled X accounts in four equal lanes: official/project, cast, original authors/creators, and production staff. Judge posts individually for their relationship to tracked works; low yield does not remove accounts from coverage.
- Use the committed cursor. Record each inspected original's stable ID and disposition, including ignored/rejected posts. Only reaching the previous cursor permits completion and advancement; an initial scan must satisfy the leased task's date boundary. Save `resumeCursor` for partial scans. External articles and search snippets are not timeline evidence.
- Choose `nextCheckAt` for completed active tasks from activity, event proximity, unresolved leads, and platform health, with short reason codes. The CLI enforces freshness; partial work does not earn normal deferral.

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

For X use the signed-in original timeline. Read the available browser-control skill and try the in-app browser first, then the user's Chrome if the first surface lacks usable access. Reuse one dedicated research tab per required browser surface; do not take over unrelated tabs. An uninitialized browser is not a blocker.

Keep platform requests sequential. HTTP 429 or an equivalent rate-limit signal stops that platform: honor `Retry-After`, save evidence and the resume cursor, and do not refresh or switch browsers to evade it. Other errors affect only the sources or operations shown to be unavailable. Continue unaffected sources and candidates with sufficient available evidence and media. Preserve concrete surface-specific failures when access remains blocked.

Verify access failures before deferring X. “Something went wrong”, a blank page, or missing DOM data alone is not evidence of rate limiting or a platform outage. Without a rate-limit signal, inspect the current URL, login state, and rendered error; make a bounded retry of the failed navigation and check another due account in the same research tab. If the browser surface remains unusable, apply the Chrome fallback above. Stop diagnostic retries once they establish the scope; do not loop on the same error. A working account means continue its coverage and isolate the failed account, not defer the whole queue.

At each resumed run, revalidate previous access blockers with a fresh browser observation once any documented cooldown has expired. A generic error does not supply a Retry-After value; distinguish an editorial retry time from a server-enforced cooldown. When the user says X is accessible, verify it promptly rather than merely repeating the claim or retaining the old blocker. Resume saved coverage as soon as access is verified. Before ending on an access blocker, ensure the evidence is current for this run and any retry already due has been attempted.

Keep access status and editorial disposition separate: an inaccessible source is blocked/partial, never ignored or a zero-result check. Preserve each task's actual progress; do not assign all unvisited accounts the failure of one account or invent resume cursors. Record attempted URL, time, browser surface, observed error, recovery attempts, and the real last inspected ID/cursor. Report unvisited tasks as pending, and report uninspected creator output as unverified rather than “no new art”.

## CLI operations

Select the operation needed for the current editorial action; these are not sequential approval stages.

| Action | Operation |
| --- | --- |
| Check registered official sources; retain unresolved changes and detect newer ones | `bun run research -- sources` |
| Plan due verified X coverage independently of website changes | `bun run research -- plan --profile=routine` |
| Refresh both sources and timeline planning, or resume an unfinished campaign | `bun run research -- cycle --profile=routine` |
| Acquire planned coverage work | `bun run research -- next --profile=routine --limit=<n>` |
| Persist and submit inspected timeline results | `bun run research -- submit <results.json> --profile=routine` |
| Retry saved unsynchronized results, when the failure permits retry | `bun run research -- submit --profile=routine` |
| Import an independently verified story | `bun run research:import <batch.json>` |
| Audit the specified campaign snapshot | `bun run research -- finish --profile=routine` |

`plan` preserves unfinished work; use `next` to resume it. Query IDs are generated locally from stable source keys. Neither an absent query ID nor a failed planner prohibits reading originals or publishing verified stories. Save unplanned coverage evidence by account/source, observed boundary, inspection time, and original IDs; reconcile it with a legitimate plan before advancing durable cursors. Do not manufacture query IDs or use `research:remember` to bypass timeline validation.

Website changes remain in `.research-cache/pending-diff.json` with version-specific `changeId` values. Continue checking while items remain pending. After Feed and resource decisions plus required public readbacks are resolved, run `bun run research:commit <resolutions.json>` with `{ "resolutions": [{ "changeId": "<exact changeId>", "outcome": "published", "reason": "<item-specific decision>", "evidenceUrls": ["<public readback URL>"] }] }`. Outcomes are `published`, `covered`, or `ignored`; published/covered require evidence URLs, and ignored requires its editorial reason. Leave blocked items unresolved. This acknowledges only the selected versions and archives their evidence; whole-diff commit/discard has been removed. A legacy v2 diff migrates on the next source check without resolving its content.

Coverage submissions preserve validated results locally before contacting production. `awaitingSync` counts inspected results awaiting persistence, not unchecked accounts. Continue other accounts and publications. Corrected payloads can be submitted normally; prior attempts stay archived. After recovery, retry saved results with their original inspection times, then inspect any newly due boundary. Archived result files alone do not prove successful sync or publication.

## Operation failures and resumption

- Retain leased task IDs and real resume cursors. Do not wait for lease expiry to continue inspection. Saved unsynchronized results retain their leases for replay; untouched expired tasks can be leased again. Never replace a campaign with saved unsynchronized evidence.
- For an approval rejection, preserve the exact rejected operation and stated reason. Compare the original post ID, text, media, proposed resource relationships, and submitted payload with the evidence. Correct local factual or payload defects first. Retry through the normal reviewed path only when allowed and supported by corrected evidence or changed authorization; never disguise the same rejected operation or switch write channels to bypass review. Do not call a rejection a reviewer mistake without inspecting its actual reason and your own input.
- Existing editorial authorization remains valid. Ask for user input only when a concrete unresolved authorization or material decision actually requires it, stating what remains missing. A rejected import does not automatically block other sources, preparation, or unrelated authorized writes; determine its actual scope and continue unaffected work.
- Goal-tool blocked thresholds are necessary conditions, not a reason to manufacture repeated audit turns. Mark blocked only under the tool's rules and when no mandatory work can meaningfully advance. A checkpoint, unchanged counter, or missing browser handle alone does not establish that condition.

## Handoff and completion

Read `.research-cache/routine-editorial.md` at the start and maintain it at the end: URL, related work, last check, finding/blocker, next action, and revisit time. Retain unresolved leads and recent completed/zero-result searches. Do not invent leased IDs for editorial searches or alter timeline cursors with external evidence.

Keep one current recovery summary at the top and update it in place; do not prepend another "current" summary each turn. Archive detailed run evidence under existing routine reports and link it from the summary. Distinguish observed coverage, successfully synchronized coverage, published items/resources, and unresolved work with their last verification times. A prior "all work exhausted" conclusion expires when sources become due or new originals appear. Automation memory should point to this summary and avoid duplicating its full history. Read history selectively for unresolved IDs or evidence.

Reconcile candidates from this run's discovery results and carried-over unfinished evidence, including candidates never imported into Admin. The Admin held list alone is not the full queue. Match stable original URLs/post IDs against production Feed and the work's media collection; check semantic duplicates before creating a new item. Close a qualified item only with its public Feed ID/link and required media/resource readback. Otherwise complete the existing candidate or repair the existing publication, or retain a concrete blocker and next action. Record a reason for an editorial rejection rather than silently dropping the item.

The committed cursor bounds new timeline discovery, not publication eligibility. A candidate at or below it still needs publication reconciliation; `seen`, `candidate`, coverage completion, and `nextCheckAt` do not prove publication. Continue known unfinished items even when their account is not due. Scoped missing-image repairs may revisit older originals without resetting or advancing discovery cursors. A zero-due queue does not close unfinished publication work.

Completion requires all due coverage to pass and every relevant original's Feed and structured-resource decisions to be resolved. Reconcile this run's time-bearing sources against actual event/schedule records, including sources ignored as duplicate Feed content; verify required resources in Admin and their public projections. Checking only resources already written, or receiving HTTP 200 from a related endpoint, does not establish that nothing is missing. Qualified publications, required reading, and projection repairs must also be complete. Optional speculative leads can carry over. Actual blockers follow the main Skill's stopping rule.

Report source counts/changes; X due, complete, partial/blocked counts by lane; new public links; merges/ignores; discoveries and deferred leads; blocker/resume evidence; and Feed/detail, structured-resource, and media verification. Honor user-designated priority accounts and report cursor, findings, and `nextCheckAt` even when not due. A quiet zero-change outcome is valid only after full coverage and adjudication establish no qualified new content.
