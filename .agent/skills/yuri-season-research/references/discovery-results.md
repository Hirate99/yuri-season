# Discovery result file

Record one result for every executed leased task, including zero-hit, partial, and blocked work. `outcome` describes execution completeness; `status` controls durable search memory.

```json
{
  "campaignId": "discovery-...",
  "results": [
    {
      "queryId": "person:person-id:social:account:official-instagram",
      "searchedAt": "2026-08-11T22:00:00Z",
      "outcome": "complete",
      "surface": "official_page",
      "status": "active",
      "nextCheckAt": "2026-08-18T22:00:00Z",
      "reasonCodes": ["first_party_identity_checked"],
      "notes": "Opened the first-party profile and the original account.",
      "hits": [
        {
          "canonicalUrl": "https://www.instagram.com/actor_handle/",
          "title": "Voice Actor official Instagram",
          "contentHash": null,
          "outcome": "candidate",
          "metadata": {
            "contentLane": "cast",
            "animeId": "anime-id",
            "personId": "person-id",
            "characterIds": ["character-id"],
            "accountId": null,
            "platform": "Instagram",
            "platformObjectId": null,
            "verificationSourceUrl": "https://agency.example/actor/profile",
            "verifiedOriginal": true
          }
        }
      ]
    }
  ]
}
```

Timeline and tag tasks require coverage evidence. The agent chooses `nextCheckAt` from current activity, events, unresolved leads, and prior yield; the CLI clamps it to the task's maximum freshness deadline.

```json
{
  "queryId": "anime:anime-id:social:updates:anime-id:account-id",
  "searchedAt": "2026-08-11T22:00:00Z",
  "outcome": "complete",
  "surface": "signed_in_timeline",
  "status": "active",
  "nextCheckAt": "2026-08-12T04:00:00Z",
  "reasonCodes": ["recent_high_activity", "broadcast_window"],
  "discoveredTerms": [
    {
      "term": "#作品公式タグ",
      "kind": "official_tag",
      "sourceUrl": "https://x.com/account/status/1954930000000000003"
    }
  ],
  "coverage": {
    "reachedPreviousCursor": true,
    "originalPostsInspected": 3,
    "repostsInspected": 1,
    "newestPostId": "1954930000000000003",
    "newestPublishedAt": "2026-08-11T21:45:00Z",
    "oldestPostId": "1954930000000000000",
    "oldestPublishedAt": "2026-08-11T12:00:00Z"
  },
  "hits": [
    {
      "canonicalUrl": "https://x.com/account/status/1954930000000000003",
      "title": "Original post",
      "contentHash": null,
      "outcome": "candidate",
      "metadata": {
        "platformObjectId": "1954930000000000003",
        "verifiedOriginal": true
      }
    }
  ]
}
```

## Required metadata by lane

For cast account or post results preserve:

- `contentLane: cast`
- `animeId`, `personId`, relevant `characterIds`
- `accountId` when already registered
- `platform` (`X` or `Instagram`)
- stable `platformObjectId` for a post
- `verificationSourceUrl` for a newly discovered identity
- `verifiedOriginal: true` only after opening the first-party/original page

For fanwork results preserve:

- `contentLane: fanwork`
- `animeId` and `platform`
- stable `platformObjectId` when available
- `creatorName`, optional `creatorUrl`
- observed platform-native `likeCount`, `favoriteCount`, or `bookmarkCount` when the platform exposes them
- `qualityGate` as `passed`, `below_threshold`, `maturing`, or `trusted_exception`, plus the short reason used
- `verifiedOriginal: true` only after confirming this is the creator's original post

For community-thread results preserve:

- `contentLane: community`
- `animeId` for a work-specific thread
- `animeIds` for a cross-work thread; include every materially covered work once
- `platform` and the canonical original thread URL
- `verifiedOriginal: true` only after opening the original thread

## Rules

- Use `active` when the target should be searched again, `exhausted` after repeated targeted searches find no credible lead, and `blocked` for login, CAPTCHA, or inaccessible sources.
- Use `complete` only after satisfying the leased task's completion policy. Use `partial` when more pages remain and include `coverage.resumeCursor`; use `blocked` with `status: blocked` when the required surface is unavailable.
- Search-engine results cannot complete `timeline_scan` or `tag_scan`. Public embeds may complete an account timeline only when the task's previous cursor was reached; they cannot complete a global newest-first tag scan.
- Every inspected original in a timeline or tag scan must be represented by a hit with a stable `metadata.platformObjectId`, including ignored and rejected posts.
- `nextCheckAt` is the agent's scheduling decision, not a fixed lane cadence. Every completed active task must provide it and explain it with short `reasonCodes`; the CLI enforces only a missed-coverage deadline and prevents partial work from being deferred.
- Put newly verified tags, aliases, units, characters, or pair terms in `discoveredTerms` with the original source URL so later tag scans can reuse them without waiting for a person to update the query.
- Use canonical HTTP(S) original-page URLs. Search pages and snippets are not hits.
- `outcome` is `seen`, `candidate`, `published`, `held`, `rejected`, or `ignored`. Do not claim `published` before a successful batch import.
- Existing published, held, rejected, or ignored URLs are not new discoveries unless the original page materially changed.
- For account discovery, identity evidence and content evidence are separate. A credible account lead is still unverified until the account record is reviewed.
- For fanwork, aggregators, mirrors, reposts, and quote-posts are `ignored` or `rejected`, not candidates.
- Record completed results promptly in any convenient chunk. The recorder derives hashes, counts, next-search time, and durable memory. Chunk size is an implementation detail, never a reason to stop while relevant due work remains.
