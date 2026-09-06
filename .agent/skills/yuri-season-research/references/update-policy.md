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

Bulk account enrollment, season-wide catalog audits, X tag scans, Pixiv/Instagram discovery, fanwork/community sweeps, and birthday audits remain separate assignments. Opening a relevant original and checking its authorship for a story is not bulk account discovery.

## Editorial judgment

Publish concrete reader value: schedule/distribution changes, PV/KV and new visuals, manga chapters, creator art and process notes, work-related cast commentary/interviews, credited staff work, events, music, and substantive merchandise news. Short captions can accompany meaningful visual storytelling; inspect media and quoted originals.

Ignore unrelated private activity, giveaways, pure reposts, and repetitive reminders without new substance. Merge announcements of the same content through existing corrections, preserving source identity and dates. An interview is the story, with its referring post retained as discovery evidence. Apply [publication-policy.md](publication-policy.md) for copy, media, and verification; editorial review is the agent's responsibility.

## Browser access

For X use the signed-in original timeline. Read the available browser-control skill and try the in-app browser first, then the user's Chrome if the first surface lacks usable access. Reuse one dedicated research tab per required browser surface; do not take over unrelated tabs. An uninitialized browser is not a blocker.

Keep platform requests sequential. HTTP 429 or an equivalent rate-limit signal stops that platform: honor `Retry-After`, save evidence and the resume cursor, and do not refresh or switch browsers to evade it. Other errors affect only the sources or operations shown to be unavailable. Continue unaffected sources and candidates with sufficient available evidence and media. Preserve concrete surface-specific failures when access remains blocked.

Verify access failures before deferring X. “Something went wrong”, a blank page, or missing DOM data alone is not evidence of rate limiting or a platform outage. Without a rate-limit signal, inspect the current URL, login state, and rendered error; make a bounded retry of the failed navigation and check another due account in the same research tab. If the browser surface remains unusable, apply the Chrome fallback above. Stop diagnostic retries once they establish the scope; do not loop on the same error. A working account means continue its coverage and isolate the failed account, not defer the whole queue.

At each resumed run, revalidate previous access blockers with a fresh browser observation once any documented cooldown has expired. A generic error does not supply a Retry-After value; distinguish an editorial retry time from a server-enforced cooldown. When the user says X is accessible, verify it promptly rather than merely repeating the claim or retaining the old blocker. Resume saved coverage as soon as access is verified. Before ending on an access blocker, ensure the evidence is current for this run and any retry already due has been attempted.

Keep access status and editorial disposition separate: an inaccessible source is blocked/partial, never ignored or a zero-result check. Preserve each task's actual progress; do not assign all unvisited accounts the failure of one account or invent resume cursors. Record attempted URL, time, browser surface, observed error, recovery attempts, and the real last inspected ID/cursor. Report unvisited tasks as pending, and report uninspected creator output as unverified rather than “no new art”.

## Handoff and completion

Read `.research-cache/routine-editorial.md` at the start and maintain it at the end: URL, related work, last check, finding/blocker, next action, and revisit time. Retain unresolved leads and recent completed/zero-result searches. Do not invent leased IDs for editorial searches or alter timeline cursors with external evidence.

Completion requires all due coverage to pass, every candidate to be adjudicated, qualified items to be published and verified, and no unfinished required reading or projection repair. Optional speculative leads can carry over. Actual blockers follow the main Skill's stopping rule.

Report source counts/changes; X due, complete, partial/blocked counts by lane; new public links; merges/ignores; discoveries and deferred leads; blocker/resume evidence; and Feed/detail, structured-resource, and media verification. Honor user-designated priority accounts and report cursor, findings, and `nextCheckAt` even when not due. A quiet zero-change outcome is valid only after full coverage and adjudication establish no qualified new content.
