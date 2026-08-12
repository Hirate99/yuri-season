# Research batch schema

Submit batches to `POST /api/admin/batches` with `Authorization: Bearer <ADMIN_TOKEN>`. The endpoint is idempotent by `batchId` and recomputes observation hashes. It never trusts a batch to bypass server publication policy.

```json
{
  "schemaVersion": "1",
  "batchId": "2026-08-11T2100Z-kimishinu-incremental",
  "createdAt": "2026-08-11T21:00:00Z",
  "agent": "codex/yuri-season-research@1",
  "scope": "incremental: current season",
  "note": "Optional operator note",
  "observations": [
    {
      "sourceId": "source-kimi-news",
      "sourceItemId": "https://example.com/news/123",
      "canonicalUrl": "https://example.com/news/123",
      "title": "Original source title",
      "excerpt": "Short evidence excerpt or close paraphrase; never a copied article.",
      "authorName": null,
      "publishedAt": "2026-08-11T12:00:00+09:00",
      "contentType": "text/html",
      "language": "ja",
      "metadata": { "researchMode": "incremental" },
      "candidates": [
        {
          "animeId": "anime-kimishinu",
          "contentClass": "official_news",
          "sourceIdentity": "official",
          "title": "简体中文事实标题",
          "summary": "只概括证据直接支持的内容。",
          "url": "https://example.com/news/123",
          "sourceName": "动画公式 NEWS",
          "importance": 3,
          "publishedAt": "2026-08-11T12:00:00+09:00",
          "presentationMode": "link_only",
          "safetyRating": "safe",
          "spoilerLevel": "none",
          "confidence": 0.94,
          "review": {
            "decision": "publish",
            "confidence": 0.94,
            "reasons": ["公式来源", "标题与摘要被证据直接支持"],
            "model": "local-codex",
            "promptVersion": "local-review@1"
          }
        }
      ]
    }
  ]
}
```

Allowed content classes are `schedule`, `official_news`, `official_art`, `creator_art`, `birthday`, `cast_post`, `staff_post`, `fanwork`, `community_thread`, and `editorial`.

Use `presentationMode: link_only` in phase one. A media candidate may be added later only with creator name, original URL, safety/spoiler labels, and a rights note.

An observation from a registered first-party work source may also contain up to eight structured `themeSongs`. The observation URL becomes the evidence URL; do not repeat it in each item.

```json
{
  "themeSongs": [{
    "animeId": "anime-kimishinu",
    "songKind": "opening",
    "sequence": 1,
    "title": "Official title",
    "artist": "Artist or character unit",
    "lyricist": null,
    "composer": null,
    "arranger": null,
    "episodeRange": null,
    "officialUrl": "https://example.com/listen",
    "coverUrl": "https://example.com/jacket.jpg",
    "coverSourceUrl": "https://example.com/release",
    "sortOrder": 0,
    "review": {
      "decision": "publish",
      "confidence": 0.96,
      "reasons": ["The official page explicitly labels the song as OP1"]
    }
  }]
}
```

Allowed `songKind` values are `opening`, `ending`, `theme`, `insert`, and `image`. Use `theme` when the official source supplies only a generic numbered theme-song label; keep its sequence and do not infer OP/ED.

Automatic structured writes require an official source, matching work ID, a `publish` review and confidence of at least `0.92`. A different title or artist in an occupied theme-song slot is a conflict and must not overwrite the existing track.

For jackets, prefer an exact Apple Music track whenever one exists: use its artwork as `coverUrl`, its track page as both `officialUrl` and `coverSourceUrl`, and record `metadata.coverSourceTrust` as `licensed_platform`. If no exact Apple Music track exists, use the anime, label, or artist's official release jacket and record `official_release`. The first-party observation remains the internal identity evidence even when the public card exposes only Apple Music. Search-result images, aggregators, mirrors, generic artist photos, and title-only matches are invalid.
