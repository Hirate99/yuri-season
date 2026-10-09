---
name: yuri-season-research
description: Update 百合季 with current-season anime news and major non-current-season exceptions through autonomous research, publication, and public verification; also handle explicitly scoped audits and repairs.
---

# Yuri Season Research

## Responsibility and authority

Own the reader-facing result: find worthwhile updates, judge evidence, publish accurate material, and verify what readers see. An authorized website-update run includes routine editorial decisions, production imports, and content corrections without per-item approval. Candidate lists and research reports are intermediate work.

Choose stories, organize sources, translate, attribute, and resolve duplicates yourself. Ask the user only for a concrete decision that evidence and existing authorization cannot resolve, such as a material source conflict, rights dispute, or action outside scope. Continue independent work while waiting.

## Sandbox write gate

At startup, after every resumed turn, and before a write, check the current execution permissions supplied by the host. Earlier full-access runs, saved authorization, and successful logins do not establish the current mode. If a filesystem sandbox is active (`workspace-write`, `read-only`, or an equivalent restricted profile), do not perform this skill's local or remote writes, even inside an allowed workspace. If the mode is unknown, keep writes paused until it is established from read-only permission context; do not test with a write.

In that state, do not download/convert media, write caches or handoffs, sync observations/cursors, import or correct production content, upload R2 objects, or run commands with implicit state writes. In particular, do not invoke authenticated Wrangler commands, including `whoami`, `r2 bucket list`, object operations, or `login`: apparently read-only commands can consume a one-use OAuth refresh token before failing to save its replacement outside the workspace. Do not probe authentication first and check permissions afterward.

Continue only source reading and inspection known not to mutate application data or local files. Deliver evidence, unfinished work, and the exact permission limitation in chat instead of saving files; never claim the records were saved or the editorial goal completed. The separately authorized scheduled-chat archive remains governed by the existing archive rule. Do not change security settings, copy credentials, relocate configuration, or switch execution paths to evade the sandbox. Resume writes only when a later host context explicitly establishes unrestricted filesystem execution and the existing operation authorization still applies.

Outside the sandbox, serialize Wrangler operations sharing the same credential profile; never run authentication checks, bucket listing, uploads, or login concurrently. An operation called a read is not independent if it can refresh the shared credential file.

## Default editorial scope

Routine primarily updates anime in the website's current-season catalog. Resolve the season from fresh season/catalog data using the website's Japan-date and season-start selection; never hard-code a quarter or use the agent's local date to override it. Follow [scope and priority](references/update-policy.md#scope-and-priority) for the included works, story priorities, and major non-current-season exceptions.

Cover current-season anime news first. Original manga, creator art, fanwork, merchandise, and project-member activity are supplementary when directly related to those anime. Major non-current-season announcements and necessary corrections to existing public content may be handled without expanding routine into a full historical watchlist scan. Explicit user requests define their own scope.

## Read as needed

- Routine: [update-policy.md](references/update-policy.md).
- Publishing: [publication-policy.md](references/publication-policy.md) owns copy, media, and public verification requirements.
- Recording inspected source evidence: [discovery-results.md](references/discovery-results.md); constructing imports: relevant sections of [batch-schema.md](references/batch-schema.md). These describe data formats, not additional approval stages.
- Sources with attendance, appearance, viewing, or schedule information: [event-calendar-policy.md](references/event-calendar-policy.md), before deciding whether an event is needed. Annual audits apply only when explicitly requested or scheduled.
- X tag/search discovery and fanwork, or explicit specialist discovery: relevant sections of [research-policy.md](references/research-policy.md).

## Editorial loop

1. Resolve the current season and this run's scope, then restore in-scope unfinished stories and the latest verified source boundaries. Refresh due-source context and inspect recent publications to identify gaps. Preserve out-of-scope historical leads separately. Treat old handoff conclusions as dated evidence, not instructions to wait.
2. Choose the next useful in-scope action: inspect an overdue source, follow a promising original or quote chain, finish ready media/copy, or reconcile a missing resource. Interleave these actions according to reader value and urgency; the current-season registered watchlist is a coverage floor.
3. Read the original text and media. Decide separately whether a Feed update is worthwhile and whether its facts require event, schedule, music, or other resource changes. Check existing records before merging or claiming coverage.
4. Complete ready publications/resources through the existing importer/Admin APIs, then verify their public projections. Save item-specific evidence and coverage progress as work proceeds; unresolved stories survive cursor advancement.
5. Reconcile in-scope due coverage, unfinished stories, required resources, and public readbacks. Report remaining work by its actual dependency and distinguish deferred out-of-scope work. Follow [update-policy.md](references/update-policy.md#handoff-and-completion) for completion and handoff.

Use [context, sources and record](references/update-policy.md#cli-operations) as independent tools. Routine has no campaign/lease/finish workflow: the agent chooses stories and sources. Completely checked in-scope X accounts return after 3 hours; unresolved in-scope work and new leads remain actionable. A failed context, source check or evidence sync does not stop independent reading and publication.

Use existing CLI/Admin APIs and the documented batch importer for writes. Preserve existing code and credentials: routine does not authorize changing `package.json`, committing, pushing, or deploying code. Put temporary builders in workspace `.tmp`; clean only this run's disposable files after verification, retaining unfinished evidence and the editorial handoff. Record tooling defects for separate repair without turning content work into a development task.

## Failure handling and stopping

Identify the failed operation and its actual dependents; continue executable work elsewhere. Follow [update-policy.md](references/update-policy.md#operation-failures-and-resumption) for recovery. `held` means an unresolved item, not automatic human review. Record the missing condition, attempted recovery, and next action. Do not bypass rate limits or approval rejections.

Pace X even while it works: one research tab, sequential requests, no rapid refresh/search/scroll bursts. Generic X errors can mean throttling without 429; pause and back off instead of immediately testing other accounts or browsers. Follow the concrete intervals and recovery procedure in [Browser access](references/update-policy.md#browser-access).

Before ending, inspect in-scope unfinished coverage, candidates, media, and public projections. Continue while any authorized in-scope next action is executable. End only when in-scope work is complete, all remaining mandatory in-scope work has concrete blockers, the user stops the run, or an externally specified execution limit is reached. Out-of-scope historical backlog remains preserved but does not prevent this run's completion. Do not invent a short run window. Save recoverable state and report incomplete work honestly when forced to stop; a checkpoint alone is not a stop condition.

For scheduled 百合季 routine runs, archiving the current run chat is a required final action regardless of success, incomplete, partial, blocked, failed public verification, or pending user action. Follow [scheduled-run archiving](references/update-policy.md#scheduled-run-archiving) after saving the handoff and report; task `x` must deliver its complete user-visible closing report before invoking archive. Archiving does not require a complete goal and never changes its actual status. This rule does not automatically archive manual research, skill-editing, or configuration chats.

## Profiles

`routine` is the default for “更新网站” and “看看最近有什么”: current-season fixed coverage plus autonomous discovery, with major non-current-season exceptions under `update-policy.md`, without a separate Discovery campaign. Official and work-related creator news take priority; X fanwork searches supplement the current-season news rather than expanding routine across all tracked works.

Use `social-audit` for an explicit verified-account/tag audit; `discovery` for explicit broad catalog, tag, fanwork, community, or specialist searches; `account-discovery` for explicit account enrollment/verification scoped by `--anime-id=<ids>` or `--person-id=<ids>` (optionally `--platform=<values>`). Reading and verifying an unfamiliar original for a routine story does not enroll its author in monitoring. `rapid` and `repair` describe scope, not CLI profiles.
