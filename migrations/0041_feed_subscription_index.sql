-- RSS orders by site publication time, independently of pinned/source dates.
CREATE INDEX idx_feed_items_subscription ON feed_items(withdrawn_at, created_at DESC, id DESC)
WHERE withdrawn_at IS NULL AND safety_rating != 'adult' AND content_class != 'editorial';
