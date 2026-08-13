-- Canonical UTC ISO strings make indexed TEXT ordering and cursor comparisons chronological.
UPDATE feed_candidates
SET published_at = strftime('%Y-%m-%dT%H:%M:%fZ', published_at)
WHERE published_at IS NOT NULL AND datetime(published_at) IS NOT NULL;

UPDATE feed_items
SET published_at = strftime('%Y-%m-%dT%H:%M:%fZ', published_at)
WHERE published_at IS NOT NULL AND datetime(published_at) IS NOT NULL;

UPDATE media_items
SET published_at = strftime('%Y-%m-%dT%H:%M:%fZ', published_at)
WHERE published_at IS NOT NULL AND datetime(published_at) IS NOT NULL;

UPDATE source_observations
SET published_at = strftime('%Y-%m-%dT%H:%M:%fZ', published_at)
WHERE published_at IS NOT NULL AND datetime(published_at) IS NOT NULL;

UPDATE discussions
SET last_activity_at = strftime('%Y-%m-%dT%H:%M:%fZ', last_activity_at)
WHERE last_activity_at IS NOT NULL AND datetime(last_activity_at) IS NOT NULL;

UPDATE anime
SET premiere_at = strftime('%Y-%m-%dT%H:%M:%fZ', premiere_at)
WHERE premiere_at IS NOT NULL AND datetime(premiere_at) IS NOT NULL;

UPDATE events
SET starts_at = strftime('%Y-%m-%dT%H:%M:%fZ', starts_at)
WHERE starts_at LIKE '%T%' AND datetime(starts_at) IS NOT NULL;

UPDATE events
SET ends_at = strftime('%Y-%m-%dT%H:%M:%fZ', ends_at)
WHERE ends_at LIKE '%T%' AND datetime(ends_at) IS NOT NULL;
