# Discovery result file

Use this shape after executing a leased discovery workset:

```json
{
  "campaignId": "discovery-...",
  "results": [
    {
      "queryId": "anime:anime-id:community:community:yamibo",
      "searchedAt": "2026-08-11T22:00:00Z",
      "status": "active",
      "notes": "Checked indexed results and opened the original thread.",
      "hits": [
        {
          "canonicalUrl": "https://example.com/original",
          "title": "集中讨论串",
          "contentHash": null,
          "outcome": "held",
          "metadata": {
            "sourceIdentity": "community",
            "verifiedOriginal": true
          }
        }
      ]
    }
  ]
}
```

Rules:

- Include one result for every executed query, including zero-hit searches.
- Use `active` when the target should be searched again on its normal cadence, `exhausted` when repeated targeted searches found no credible lead, and `blocked` for login, CAPTCHA, or inaccessible sources.
- Use only canonical HTTP(S) original-page URLs. Search-result URLs and snippets are not hits.
- `outcome` is `seen`, `candidate`, `published`, `held`, `rejected`, or `ignored`. Do not claim `published` without a successful batch import.
- Keep at most 12 results in one file. The recorder derives hashes, counts, next-search time, and durable search memory.
