ALTER TABLE media_assets
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0
  CHECK (sort_order BETWEEN 0 AND 1000);

CREATE INDEX idx_media_assets_ordered_public
  ON media_assets(media_id, status, sort_order, source_url, variant, width);
