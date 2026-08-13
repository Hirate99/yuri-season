# Research batch schema

Import a UTF-8 JSON file with `bun run research:import -- <batch.json>`. The Admin endpoint is idempotent by `batchId`, recomputes observation hashes, and applies server publication policy.

## Observation provenance

Each observation must use exactly one provenance form:

- `sourceId`: an existing registered research source;
- `accountId`: an existing verified account, used for account-originated cast/staff posts;
- `source`: an inline disabled provenance record for an original community or social page.

An inline source has this shape and cannot claim official/verified trust:

```json
{
  "sourceType": "social",
  "label": "Original creator",
  "url": "https://www.pixiv.net/users/123",
  "trustLevel": "community"
}
```

## Cast post

Use the verified account as observation provenance. The importer validates `cast_credits`, account ownership/verification, post URL ownership, and stable platform post ID. It derives cast identity and a cast-specific deduplication key.

```json
{
  "schemaVersion": "1",
  "batchId": "2026-08-11T2100Z-cast-posts",
  "createdAt": "2026-08-11T21:00:00Z",
  "agent": "codex/yuri-season-research@2",
  "scope": "discovery: verified cast posts",
  "observations": [
    {
      "accountId": "account-voice-actor-x",
      "sourceItemId": "1954930000000000000",
      "canonicalUrl": "https://x.com/actor/status/1954930000000000000",
      "title": "Voice actor post about the episode",
      "excerpt": "Close paraphrase of the work-specific evidence.",
      "authorName": "Voice Actor",
      "publishedAt": "2026-08-11T12:00:00+09:00",
      "contentType": "text/html",
      "language": "ja",
      "metadata": {
        "researchMode": "discovery",
        "contentLane": "cast",
        "platform": "X"
      },
      "candidates": [
        {
          "animeId": "anime-id",
          "personId": "person-id",
          "characterId": "character-id",
          "accountId": "account-voice-actor-x",
          "platformObjectId": "1954930000000000000",
          "contentClass": "cast_post",
          "sourceIdentity": "cast",
          "title": "声优谈到本作最新一集",
          "summary": "只概括原帖明确涉及本作的内容。",
          "url": "https://x.com/actor/status/1954930000000000000",
          "sourceName": "Voice Actor",
          "publishedAt": "2026-08-11T12:00:00+09:00",
          "presentationMode": "link_only",
          "safetyRating": "safe",
          "spoilerLevel": "minor",
          "confidence": 0.95,
          "review": {
            "decision": "publish",
            "confidence": 0.95,
            "reasons": ["账号已验证", "原帖明确提及本作与角色"],
            "model": "local-codex",
            "promptVersion": "local-review@2"
          }
        }
      ]
    }
  ]
}
```

## Account discovery

Account discovery belongs in `accountDiscoveries` on a traceable observation. It never creates a verified account, even when review says publish. Use an official profile, agency page, or first-party cross-link as `verificationSourceUrl`; a search result page is invalid.

```json
{
  "accountDiscoveries": [
    {
      "animeId": "anime-id",
      "personId": "person-id",
      "platform": "Instagram",
      "handle": "actor_handle",
      "url": "https://www.instagram.com/actor_handle/",
      "verificationSourceUrl": "https://agency.example/actor/profile",
      "review": {
        "decision": "hold",
        "confidence": 0.96,
        "reasons": ["经纪公司资料页链接到该账号"]
      }
    }
  ]
}
```

## Fanwork

Fanwork requires an inline creator source, original creator post, and media metadata. Candidate `url` must equal `media.originalUrl`. Allowed media classes are `fanart`, `fan_video`, and `cosplay`. The server forces `link_only` and holds every fanwork in phase one.

```json
{
  "source": {
    "sourceType": "social",
    "label": "Creator Name",
    "url": "https://www.instagram.com/creator/",
    "trustLevel": "community"
  },
  "sourceItemId": "post-shortcode",
  "canonicalUrl": "https://www.instagram.com/p/post-shortcode/",
  "excerpt": "The creator's original fanwork caption, closely paraphrased.",
  "metadata": { "contentLane": "fanwork", "platform": "Instagram" },
  "candidates": [
    {
      "animeId": "anime-id",
      "platformObjectId": "post-shortcode",
      "contentClass": "fanwork",
      "sourceIdentity": "community",
      "title": "同人作品",
      "summary": "简要说明作品与原作的关系。",
      "url": "https://www.instagram.com/p/post-shortcode/",
      "sourceName": "Creator Name",
      "publishedAt": "2026-08-11T12:00:00Z",
      "presentationMode": "link_only",
      "safetyRating": "safe",
      "spoilerLevel": "none",
      "media": {
        "contentClass": "fanart",
        "title": "同人作品",
        "creatorName": "Creator Name",
        "creatorUrl": "https://www.instagram.com/creator/",
        "originalUrl": "https://www.instagram.com/p/post-shortcode/",
        "presentationMode": "link_only",
        "safetyRating": "safe",
        "spoilerLevel": "none",
        "rightsNote": "仅链接原帖，不复制图片"
      },
      "review": {
        "decision": "hold",
        "confidence": 0.94,
        "reasons": ["已确认原作者原帖", "同人内容需人工审核"]
      }
    }
  ]
}
```

## General candidate rules

Allowed content classes are `schedule`, `official_news`, `official_art`, `creator_art`, `birthday`, `cast_post`, `staff_post`, `fanwork`, `community_thread`, and `editorial`. Use `presentationMode: link_only` in phase one. Every candidate needs a review object with `decision`, `confidence`, and evidence-based reasons.

Structured `themeSongs` are allowed only on a registered first-party observation. `songKind` is one of `opening`, `ending`, `theme`, `insert`, or `image`. Use `theme` when the official source supplies only a generic numbered theme-song label; keep its sequence and do not infer OP/ED. Automatic writes require an official source, matching anime ID, `publish`, and confidence at least 0.92. Never overwrite a conflicting occupied slot.

For jackets, prefer an exact Apple Music track whenever one exists: use its artwork as `coverUrl`, its track page as both `officialUrl` and `coverSourceUrl`, and record `metadata.coverSourceTrust` as `licensed_platform`. If no exact Apple Music track exists, use the anime, label, or artist's official release jacket and record `official_release`. The first-party observation remains the internal identity evidence even when the public card exposes only Apple Music. Search-result images, aggregators, mirrors, generic artist photos, and title-only matches are invalid.
