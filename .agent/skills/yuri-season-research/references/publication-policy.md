# Publication and media policy

Use this policy for public copy, attached media, storage operations, migrations, deduplication, and publication repair.

## Natural title consistency

- Every public Feed title must carry the work's canonical public name or an explicitly approved display form. Card metadata is not a substitute. Keep sentence order natural: announcements may lead with the work or event; creator/cast items may lead with the person's action; community items may lead with the platform or topic while still identifying the work.
- Preserve natural verbs and rhythm (`公开`, `宣布`, `上线`, `分享`, `谈到`, `绘制`) while keeping work, person, event, and source identities stable. Do not normalize titles into one mechanical prefix.
- Avoid silent drift among canonical titles, abbreviations, translations, romanization, and old punctuation. Use an alias only when source-significant or materially clearer; do not let it replace canonical identity throughout a series.
- Standardize Chinese typography unless a source name requires otherwise: `第7话`, `8月16日`, and `第1—5话`.
- For repair batches, group by work, content lane, and source identity; review neighboring titles and original evidence; produce per-item proposals. Preserve intentional cross-work, named-event, official-product, community, and creator-led forms. Never run a blanket Feed-wide prefix or regex rewrite.

## Publication media invariant

- Every automatically published observation, including an official webpage, must declare `mediaDisposition: none | attached | unavailable | link_only_policy`. `none` is valid only after opening the original and confirming that it has no media. `attached` requires uploaded `candidate.media.assets`.
- Reserve `unavailable` for source bytes that cannot actually be recovered after reasonable attempts, such as deleted, private, or persistently inaccessible media.
- `link_only_policy` is an evidence-backed exception, never a safe default. Use it only when an opened source or platform rule explicitly prohibits redistribution, rehosting, or embedding. `mediaDispositionReason` must identify the rule and include its URL.
- Absence of affirmative permission, an unexamined policy, importer defaults, missing R2 access, upload failure, or inconvenience does not establish a link-only policy. When media exists and no explicit prohibition is found, retrieve, upload, and verify the actual asset before publication; otherwise hold the item or record the repair as incomplete.
- Treat readable original text as mandatory for every newly published social post. `link_only` presentation never permits an empty `publicText`; if text cannot be preserved, hold or reject it.
- Public rights copy stays human-readable (`图片来自原帖` or `官方图片`). Bucket, object-key, byte-cache, and other storage details remain internal.

## Storage, migration, and deduplication

- Treat a format migration as a storage operation, not a URL edit. Verify source bytes, transcode when needed, upload, then fetch and decode the new object. A suffix does not prove MIME type.
- Audit both public Feed projection and every affected work's Admin resource collection. Feed media may be projected from approved `media_assets`; checking only candidate fields or one API misses legacy objects.
- Before a batch migration, record total scope and classify items by stable original URL, non-null platform object ID, and semantic content. Never group null platform IDs together. Exact URL/ID uniqueness does not rule out semantic duplicates.
- For semantic duplicates, retain the item with stronger provenance and reader value—normally the stable original post with preserved source text and an approved stored asset—and withdraw the weaker duplicate with an audit reason. Do not merge materially different updates because their titles or images look similar.
- Production media work requires confirmed remote R2 write access. Login, D1 access, or public R2 GET does not imply object write permission. If the remote bucket cannot be listed or written, stop before changing media records; do not use a local Wrangler object, external hotlink, or renamed URL.

## Reader-facing completion gate

- Read back every published item and verify title, summary, original text, Chinese translation, source link, related work/event, attribution, timestamps, and every projection supported by the evidence.
- For publishable media, completion requires the actual source asset: inspect it, preserve provenance and dimensions, upload it remotely, link the media record, then confirm the public URL returns the expected MIME type and the public item points to it. A cover fallback, external hotlink, local object, or populated-but-unprojected `media` input does not pass.
- After every media write, confirm stored path, MIME, dimensions, byte identity/hash, attribution/provenance, and Feed/Admin projection. Leave the prior asset intact if any check fails.
- Do not finish while a published item has missing, placeholder, inaccessible, incorrectly attributed, or unprojected media. Repair it or preserve an evidence-backed policy prohibition; operational failure remains incomplete work.
- Treat stored datetimes as instants. Public timestamps require `Z` or an explicit offset and must render consistently. For a date-only source, use 12:00:00 in the publisher's local IANA timezone on that date and store the resolved explicit offset; `capturedAt` remains the actual capture instant.

## Tool note

Use local CLI/Admin APIs for imports and state; do not use UI automation for routine writes or change production credentials to make a local command pass. When invoking generated Hono API accessors from PowerShell, escape the `$` in names such as `['$get']` and `['$post']`.
