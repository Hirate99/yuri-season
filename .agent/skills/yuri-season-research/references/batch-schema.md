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
      "publicText": "The original post text, preserved as plain text when redistribution is allowed.",
      "publicTranslation": "A faithful Chinese translation of publicText, never an editorial summary.",
      "authorName": "Voice Actor",
      "publishedAt": "2026-08-11T12:00:00+09:00",
      "contentType": "text/html",
      "language": "ja",
      "metadata": {
        "researchMode": "discovery",
        "contentLane": "cast",
        "platform": "X"
      },
      "mediaDisposition": "none",
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
          "spoilerLevel": "mild",
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

`publishedAt` must always be an ISO datetime with `Z` or an explicit offset. If the original source supplies only a calendar date, use 12:00:00 in the source publisher's local IANA timezone on that date and resolve that date's actual offset; do not use midnight, UTC by default, or the runtime/viewer timezone. For example, a date-only Japanese official item on 2026-08-14 is `2026-08-14T12:00:00+09:00`. Keep `capturedAt` as the real capture instant rather than applying this fallback.

For official downloadable galleries, create one candidate and one `media` object. Put every stored image or size variant in `media.assets`; do not create duplicate candidates or parallel URL/hash arrays. Assets sharing the same `sourceUrl` are variants of one logical image. `sortOrder` orders logical images, while `variant` identifies `original`, `preview`, or `thumbnail`. Every asset requires a verified production `r2Key`, SHA-256 `contentHash`, source URL, MIME type, rights status, and human-readable rights basis. A media object containing assets must use `mirrored_with_permission`.

Before uploading a large original, run `bun run research:media:variants -- <input> <original-r2-key> <output-directory>`. It creates 320 px `thumbnail` and 960 px `preview` WebP files plus their R2 keys, hashes, dimensions, and byte sizes. Add those records to the same `media.assets` array, copying the original asset's `sourceUrl`, `sortOrder`, alt text, and rights evidence. Upload and read back every generated key before submitting the batch; the command itself never uploads or writes D1.

```json
{
  "media": {
    "contentClass": "official_art",
    "title": "公式头像素材",
    "creatorName": "动画公式",
    "originalUrl": "https://official.example/special/gallery.html",
    "presentationMode": "mirrored_with_permission",
    "rightsNote": "公式页面明确提供下载与分享",
    "assets": [
      {
        "r2Key": "yuri/publications/work/gallery/image-01.jpg",
        "sourceUrl": "https://official.example/special/image-01.jpg",
        "contentHash": "64-character-lowercase-sha256",
        "mimeType": "image/jpeg",
        "width": 1000,
        "height": 1000,
        "byteSize": 123456,
        "sortOrder": 0,
        "variant": "original",
        "altText": "角色名 官方头像",
        "rightsStatus": "official_promo_reviewed",
        "rightsBasis": "公式页面明确提供下载与分享"
      }
    ]
  }
}
```

Use `excerpt` for internal paraphrase, `publicText` for publishable source text, and `publicTranslation` for its complete Chinese translation. Both public fields are plain text, limited to 24,000 characters each; do not silently truncate. Apply the text rights and translation rules in `publication-policy.md`; the server also enforces the registered source's public-text policy.

For a newly published social post, `publicText` is required even when `presentationMode` is `link_only`. If the source is private, deleted, inaccessible, or its text cannot be preserved under policy, set the review decision to `hold` or `reject`; do not publish a title-and-summary-only social card.

For media disposition, canonical names, source text/translation, and public verification, follow `publication-policy.md`. This schema reference does not add an approval stage.

Allowed content classes are `schedule`, `official_news`, `official_art`, `creator_art`, `cast_post`, `staff_post`, `fanwork`, `community_thread`, and `editorial`. Birthdays are never feed candidates: a verified birthday updates the character record and calendar event only; birthday-related celebration art enters the feed as `official_art` / `creator_art` (or `cast_post` for a cast birthday post) under that lane's rules. Candidate `presentationMode: link_only` during phase-one review does not justify `mediaDisposition: link_only_policy` and does not permit publishing an image-bearing social update without its required assets. Every candidate needs a review object with `decision`, `confidence`, and evidence-based reasons.

Structured `themeSongs` are allowed only on a registered first-party observation. `songKind` is one of `opening`, `ending`, `theme`, `insert`, or `image`. Use `theme` when the official source supplies only a generic numbered theme-song label; keep its sequence and do not infer OP/ED. Automatic writes require an official source, matching anime ID, `publish`, and confidence at least 0.92. Never overwrite a conflicting occupied slot.

For jackets, prefer an exact Apple Music track whenever one exists: use its artwork as `coverUrl`, its track page as both `officialUrl` and `coverSourceUrl`, and record `metadata.coverSourceTrust` as `licensed_platform`. If no exact Apple Music track exists, use the anime, label, or artist's official release jacket and record `official_release`. The first-party observation remains the internal identity evidence even when the public card exposes only Apple Music. Search-result images, aggregators, mirrors, generic artist photos, and title-only matches are invalid.

## Cross-work community thread

Create one candidate for one canonical thread URL. Keep one covered work in `animeId` as the representative foreign key and list the complete covered set in `animeIds`. For a comprehensive seasonal thread, derive the set from the current-season catalog and remove only verified exceptions; do not emit one duplicate candidate per work.

```json
{
  "animeId": "anime-anchor",
  "animeIds": ["anime-anchor", "anime-second", "anime-third"],
  "contentClass": "community_thread",
  "sourceIdentity": "community",
  "title": "2026 夏季百合动画综合讨论",
  "summary": "百合会本季度综合讨论入口，覆盖当前片单中的大多数作品。",
  "url": "https://bbs.yamibo.com/thread-example.html",
  "sourceName": "百合会",
  "publishedAt": "2026-08-12T12:00:00+08:00",
  "presentationMode": "link_only",
  "safetyRating": "safe",
  "spoilerLevel": "mild",
  "review": {
    "decision": "publish",
    "confidence": 0.95,
    "reasons": ["已打开原始综合讨论串", "已核实关联作品并通过自动发布条件"]
  }
}
```
