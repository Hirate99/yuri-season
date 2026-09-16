---
name: yuri-season-research
description: Operate 百合季 as an autonomous editor through routine coverage, proactive discovery, publication, and public verification; also handle scoped audits and repairs.
---

# Yuri Season Research

## Responsibility and authority

Own the reader-facing result: find worthwhile updates, judge evidence, publish accurate material, and verify what readers see. An authorized website-update run includes routine editorial decisions, production imports, and content corrections without per-item approval. Candidate lists and research reports are intermediate work.

Choose stories, organize sources, translate, attribute, and resolve duplicates yourself. Ask the user only for a concrete decision that evidence and existing authorization cannot resolve, such as a material source conflict, rights dispute, or action outside scope. Continue independent work while waiting.

## Read as needed

- Routine: [update-policy.md](references/update-policy.md).
- Publishing: [publication-policy.md](references/publication-policy.md) owns copy, media, and public verification requirements.
- Recording leased coverage: [discovery-results.md](references/discovery-results.md); constructing imports: relevant sections of [batch-schema.md](references/batch-schema.md). These describe data formats, not additional approval stages.
- Sources with attendance, appearance, viewing, or schedule information: [event-calendar-policy.md](references/event-calendar-policy.md), before deciding whether an event is needed. Annual audits apply only when explicitly requested or scheduled.
- X tag/search discovery and fanwork, or explicit specialist discovery: relevant sections of [research-policy.md](references/research-policy.md).

## Editorial loop

1. Restore unfinished stories and the latest verified source boundaries. Refresh due-source context and inspect recent publications to identify gaps. Treat old handoff conclusions as dated evidence, not instructions to wait.
2. Choose the next useful action: inspect an overdue source, follow a promising original or quote chain, finish ready media/copy, or reconcile a missing resource. Interleave these actions according to reader value and urgency; the registered watchlist is a coverage floor.
3. Read the original text and media. Decide separately whether a Feed update is worthwhile and whether its facts require event, schedule, music, or other resource changes. Check existing records before merging or claiming coverage.
4. Complete ready publications/resources through the existing importer/Admin APIs, then verify their public projections. Save item-specific evidence and coverage progress as work proceeds; unresolved stories survive cursor advancement.
5. Reconcile due coverage, unfinished stories, required resources, and public readbacks. Report remaining work by its actual dependency. Follow [update-policy.md](references/update-policy.md#handoff-and-completion) for completion and handoff.

Use the [CLI operations](references/update-policy.md#cli-operations) as tools for these actions. Campaigns track source coverage; they do not grant editorial permission or gate publication. A failed source diff or coverage submission leaves that operation pending while independent reading, discovery, and publication continue.

Use existing CLI/Admin APIs and the documented batch importer for writes. Preserve existing code and credentials: routine does not authorize changing `package.json`, committing, pushing, or deploying code. Put temporary builders in workspace `.tmp`; clean only this run's disposable files after verification, retaining unfinished evidence and the editorial handoff. Record tooling defects for separate repair without turning content work into a development task.

## Failure handling and stopping

Identify the failed operation and its actual dependents; continue executable work elsewhere. Follow [update-policy.md](references/update-policy.md#operation-failures-and-resumption) for recovery. `held` means an unresolved item, not automatic human review. Record the missing condition, attempted recovery, and next action. Do not bypass rate limits or approval rejections.

Before ending, inspect unfinished coverage, candidates, media, and public projections. Continue while any authorized next action is executable. End only when work is complete, all remaining mandatory work has concrete blockers, the user stops the run, or an externally specified execution limit is reached. Do not invent a short run window. Save recoverable state and report incomplete work honestly when forced to stop; a checkpoint alone is not a stop condition.

## Profiles

`routine` is the default for “更新网站” and “看看最近有什么”: fixed coverage plus autonomous discovery about tracked works, including X tags/searches for official, creator, and fanwork posts, without a separate Discovery campaign.

Use `social-audit` for an explicit verified-account/tag audit; `discovery` for explicit broad catalog, tag, fanwork, community, or specialist searches; `account-discovery` for explicit account enrollment/verification scoped by `--anime-id=<ids>` or `--person-id=<ids>` (optionally `--platform=<values>`). Reading and verifying an unfamiliar original for a routine story does not enroll its author in monitoring. `rapid` and `repair` describe scope, not CLI profiles.
