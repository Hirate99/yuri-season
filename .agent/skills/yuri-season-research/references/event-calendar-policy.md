# Notable events and calendar policy

Use this policy for updating the public calendar and each work's event resources. Calendar entries are verified time-bearing facts, not dates inferred from Feed copy.

For routine stories, apply event identity, time, and readback rules only to the encountered events. The annual Comic Market completeness checks below apply to an explicitly requested or scheduled calendar audit; they do not expand every routine story into an annual audit.

## Scope and priority

- Cover medium- and large-scale public events with durable reader value: work or project concerts and Lives, stage or screening events, official online concerts or program festivals, conventions, exhibitions, industry/fan expos, and comparable hybrid events involving tracked works, project units, verified creators, or principal cast.
- Scale is not the sole inclusion gate. A work-related voice-actor meet-and-greet, stage greeting, Talk Event, signing, handover event, or other scheduled cast appearance belongs on the calendar when it has a verified public time, a direct relationship to a tracked work or project, and independent reader value.
- Include scheduled radio/TV guest appearances, special programs, online discussions, and collective screenings when their work-related content or participants give readers a concrete reason to attend or tune in. A date triggers review, not automatic inclusion: generic campaigns and routine reminders need no new event, but can update an existing one. Ordinary episode broadcasts and releases use their existing schedule/resource lanes.
- Comic Market is an always-covered series. For every calendar year, check the official Comic Market organizer and add every officially announced edition, including summer and winter editions when held. Use the official edition identity, such as `Comic Market 108（C108）`; never infer an edition number, date, venue, or cancellation status from prior-year cadence.
- A Comic Market edition belongs on the notable-event calendar even before a specific tracked work announces participation. Later work, creator, circle, booth, or merchandise announcements enrich the same event and may produce their own Feed updates; they do not create duplicate event records.

## Evidence and event identity

- Verify dates and status from the organizer, venue, ticketing host, streaming host, or another first-party page. A work or performer announcement can prove its own participation, but a repost, search result, ticket reseller, event aggregator, or past edition cannot establish the event's canonical schedule.
- Identify an edition by canonical series name, official edition/number, organizer, and date range. Repeated announcements, ticket phases, lineups, venue maps, booth details, streaming access, and participating-work posts update that identity rather than creating parallel events.
- Use the official event name and edition in the calendar title. Keep abbreviations such as `C108` as an approved display aid, not as a replacement for the canonical identity. Preserve renamed, postponed, cancelled, or rescheduled editions as the same event with updated status and evidence.
- Associate every materially participating tracked work, person, or project that the data model supports. Do not attach a global or cross-work event to an arbitrary anime merely to make it appear in the public calendar, and do not clone one convention for every participating work.

## Time and classification

- Use `eventType: event` for in-person and hybrid attendance events. Use `stream` for scheduled listening/viewing programs, including qualifying radio/TV guest appearances and online programs or concerts; preserve the actual medium and access URL without implying that radio is video. Ordinary episode broadcasts and product releases remain in their existing lanes.
- Store the event's local IANA timezone. When the official source gives an exact time, save an offset-bearing instant. When it gives only a calendar date, preserve the date-only value instead of inventing a clock time.
- Normalize broadcaster times beyond 24:00 into the following local calendar day (for example, September 12 at 25:00 is September 13 at 01:00), retaining the source wording in evidence. Distinguish the program's start from a guest segment's start; do not invent a segment time or duration.
- Represent a multi-day event as one canonical event spanning the full official range: `startsAt` is the first day or opening instant and `endsAt` is the final day or closing instant, both in the event timezone. Do not create one duplicate event per day. Create separate session records only when the days contain independently named, independently ticketed, or independently streamed programs that have their own reader value; keep them related to the canonical parent event when the model supports that relationship.
- If only the start date is announced, keep `endsAt` unknown and schedule a follow-up rather than guessing the duration. If the public Calendar or API drops `endsAt`, renders only the first day, or cannot express the range, record a projection repair and keep the event incomplete even when Admin storage is correct.
- Treat each convention or concert edition as a distinct event. Do not use `recurrenceRule` for Comic Market or another branded annual series: future editions, numbering, dates, venues, and cancellation states require separate first-party verification.
- Keep the announcement publication time separate from `startsAt` and `endsAt`. One event may support several Feed updates, but Feed publication timestamps must never replace the calendar schedule.

## Monitoring and reconciliation

- On first announcement, create or update the event and schedule the next check from unresolved facts and event proximity. Recheck when dates, venue/platform, ticketing, participating works, lineup, streaming access, postponement, or cancellation remain open; use a temporary rapid window near the event rather than a permanent high-frequency task.
- After the event, mark its status from first-party evidence and retain the historical record. A cancellation remains a cancelled verified event, not a deletion. Discovering a later edition creates a new edition record while preserving the prior one.
- For cross-work events, preserve one canonical event identity and all material relationships. If the current storage or public projection cannot represent a global/shared event, record a concrete model-repair task and keep event coverage incomplete; do not silently omit the event, assign a false anchor work, or manufacture duplicates.

## Completion gate

- Read back both the Admin event resource and the public Calendar. Verify canonical title/edition, type, start and end, timezone, status, official source URL, work/person relationships, ordering, and viewer-timezone rendering. A multi-day event must visibly retain its complete date range rather than appearing as a one-day event.
- Read back any related Feed announcement separately. Confirm it links to the same event identity and does not duplicate an existing announcement or use the announcement date as the event date.
- For the current calendar year, compare the official Comic Market edition list with stored event identities. Every officially announced edition must appear exactly once with current status and source evidence. A missing edition, arbitrary work anchor, duplicate edition, guessed date, or calendar projection failure blocks event completion.
