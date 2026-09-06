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
- Explicit specialist discovery: relevant sections of [research-policy.md](references/research-policy.md).

## Working loop

1. Restore due unfinished work from `.research-cache/routine-editorial.md`, then run `bun run research -- cycle --profile=routine`.
2. Process source differences and lease due timelines with `bun run research -- next --profile=routine --limit=<n>`. Interleave useful discovery and publication according to urgency; do not accumulate all candidates until scanning ends.
3. Open originals and decide both their Feed value and the event/schedule or other structured facts they support. Reconcile those facts even when no new Feed card is needed. Complete ready items through media, content/resource imports, and public verification in manageable batches. A partial timeline does not prevent publishing an independently verified post; publication does not prove timeline completion.
4. Record leased coverage with `bun run research -- submit <results.json> --profile=routine`. Resolve source differences before rerunning `cycle`; repeat the work, then run `bun run research -- finish --profile=routine`.
5. Check remaining editorial and public-verification work separately. CLI convergence proves planned coverage only.

Use existing CLI/Admin APIs and the documented batch importer for writes. Preserve existing code and credentials: routine does not authorize changing `package.json`, committing, pushing, or deploying code. Put temporary builders in workspace `.tmp`; clean only this run's disposable files after verification, retaining unfinished evidence and the editorial handoff. Record tooling defects for separate repair without turning content work into a development task.

## Failure handling and stopping

An error changes the next action, not the objective. Identify the failed operation and its actual dependents, try an applicable alternative, then continue another executable item. A page error is not automatically a platform outage. Do not repeat a failing method without new evidence or bypass rate limits or approval rejections.

Unverified text, unfinished uploads, and pending imports are the editor's work queue. If the schema calls them `held`, that does not imply human review. A deferred item must identify its missing condition, attempted recovery, and next action; perform that action now when possible. Reserve human intervention for a specific unresolved decision, not ordinary editorial judgment or tool inconvenience.

Before ending, inspect unfinished coverage, candidates, media, and public projections. Continue while any authorized next action is executable. End only when work is complete, all remaining mandatory work has concrete blockers, the user stops the run, or an externally specified execution limit is reached. Do not invent a short run window. Save recoverable state and report incomplete work honestly when forced to stop; a checkpoint alone is not a stop condition.

## Profiles

`routine` is the default for “更新网站” and “看看最近有什么”: fixed coverage plus autonomous discovery about tracked works, without a separate Discovery campaign.

Use `social-audit` for an explicit verified-account/tag audit; `discovery` for explicit broad catalog, tag, fanwork, community, or specialist searches; `account-discovery` for explicit account enrollment/verification scoped by `--anime-id=<ids>` or `--person-id=<ids>` (optionally `--platform=<values>`). Reading and verifying an unfamiliar original for a routine story does not enroll its author in monitoring. `rapid` and `repair` describe scope, not CLI profiles.
