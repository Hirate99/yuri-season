# Discovery result file

Record one result for every executed leased query, including zero-hit and blocked searches:

```json
{
  "campaignId": "discovery-...",
  "results": [
    {
      "queryId": "person:person-id:social:account:official-instagram",
      "searchedAt": "2026-08-11T22:00:00Z",
      "status": "active",
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
- `verifiedOriginal: true` only after confirming this is the creator's original post

For community-thread results preserve:

- `contentLane: community`
- `animeId` for a work-specific thread
- `animeIds` for a cross-work thread; include every materially covered work once
- `platform` and the canonical original thread URL
- `verifiedOriginal: true` only after opening the original thread

## Rules

- Use `active` when the target should be searched again, `exhausted` after repeated targeted searches find no credible lead, and `blocked` for login, CAPTCHA, or inaccessible sources.
- Use canonical HTTP(S) original-page URLs. Search pages and snippets are not hits.
- `outcome` is `seen`, `candidate`, `published`, `held`, `rejected`, or `ignored`. Do not claim `published` before a successful batch import.
- Existing published, held, rejected, or ignored URLs are not new discoveries unless the original page materially changed.
- For account discovery, identity evidence and content evidence are separate. A credible account lead is still unverified until the account record is reviewed.
- For fanwork, aggregators, mirrors, reposts, and quote-posts are `ignored` or `rejected`, not candidates.
- Record completed results promptly in any convenient chunk. The recorder derives hashes, counts, next-search time, and durable memory. Chunk size is an implementation detail, never a reason to stop while relevant due work remains.
